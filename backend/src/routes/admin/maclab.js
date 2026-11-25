// MacLab: Nabila mengisi pesanan kolaborasi / mendadak langsung di dasbor.
// File terpisah dari routes/admin/orders.js (milik Darnell) supaya tidak bentrok saat merge.
// Dipasang di /admin/orders (lihat routes/index.js), jadi endpoint-nya POST /admin/orders.
const express = require('express');
const pool = require('../../db/pool');
const { calculateOrder } = require('../../services/pricing');
const { publicToken, orderCode } = require('../../services/token');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { maclabOrderCreate } = require('../../validators/maclab');
const { httpError } = require('../../middleware/errorHandler');
const { loadDetail } = require('./orders');

const router = express.Router();

async function createMaclabOrder(body, adminId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // katalog dari database; harga item menu dari browser tidak dipakai
    const menuIds = [...new Set(body.items.filter((i) => i.item_type === 'menu').map((i) => i.menu_id))];
    const menuRes = await client.query(
      'SELECT id, name, price, is_available FROM menus WHERE id = ANY($1::int[])',
      [menuIds]
    );
    const habis = menuRes.rows.filter((m) => !m.is_available);
    if (habis.length > 0) {
      throw httpError(409, 'MENU_UNAVAILABLE', `Menu sedang habis: ${habis.map((m) => m.name).join(', ')}`);
    }
    const optRes = await client.query(
      'SELECT id, menu_id, option_group, name, extra_price FROM menu_options WHERE menu_id = ANY($1::int[])',
      [menuIds]
    );
    const menus = new Map(menuRes.rows.map((m) => [m.id, m]));
    const options = new Map(optRes.rows.map((o) => [o.id, o]));

    // hitung harga (lempar PricingError bila menu/opsi/delivery_index tidak sah)
    const { items: priced } = calculateOrder(
      {
        items: body.items.map((i) => ({
          delivery_index: i.delivery_index,
          item_type: i.item_type,
          menu_id: i.menu_id,
          custom_name: i.custom_name,
          unit_price: i.unit_price,
          qty: i.qty,
          option_ids: i.option_ids,
        })),
        deliveries: body.deliveries.map((d) => ({
          method: d.method,
          shipping_fee: d.method === 'antar_nabila' ? d.shipping_fee : 0,
        })),
        discount: body.discount,
        status: 'menunggu_pembayaran',
      },
      { menus, options }
    );

    // paling banyak satu opsi per option_group (sama dengan form publik)
    priced.forEach((it, i) => {
      const seen = new Set();
      for (const o of it.options) {
        const key = options.get(o.menu_option_id).option_group ?? `id:${o.menu_option_id}`;
        if (seen.has(key)) {
          throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [
            { field: `items.${i}.option_ids`, message: `Pilih paling banyak satu opsi untuk ${key}` },
          ]);
        }
        seen.add(key);
      }
    });

    // status awal mengikuti waktu bayar (KF bagian 5)
    const status = body.pay_timing === 'setelah_kirim' ? 'diproses' : 'menunggu_pembayaran';
    const code = orderCode();
    const token = publicToken();

    const orderRes = await client.query(
      `INSERT INTO orders (order_code, customer_name, phone, source, status, pay_timing, discount, public_token)
       VALUES ($1, $2, $3, 'admin_form', $4, $5, $6, $7) RETURNING id`,
      [code, body.customer_name, body.phone || null, status, body.pay_timing, body.discount, token]
    );
    const orderId = orderRes.rows[0].id;

    const deliveryIds = [];
    for (const d of body.deliveries) {
      const r = await client.query(
        `INSERT INTO deliveries (order_id, delivery_date, method, address, shipping_fee)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [orderId, d.delivery_date, d.method, d.method === 'antar_nabila' ? d.address : null, d.method === 'antar_nabila' ? d.shipping_fee : 0]
      );
      deliveryIds.push(r.rows[0].id);
    }

    for (let i = 0; i < priced.length; i++) {
      const it = priced[i];
      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, delivery_id, menu_id, item_type, custom_name, qty, unit_price, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [orderId, deliveryIds[it.delivery_index], it.menu_id, it.item_type, it.custom_name, it.qty, it.unit_price, body.items[i].note || null]
      );
      for (const o of it.options) {
        await client.query(
          `INSERT INTO order_item_options (order_item_id, menu_option_id, extra_price) VALUES ($1, $2, $3)`,
          [itemRes.rows[0].id, o.menu_option_id, o.extra_price]
        );
      }
    }

    await client.query(
      `INSERT INTO order_events (order_id, admin_id, event_type, to_status)
       VALUES ($1, $2, 'order_created', $3)`,
      [orderId, adminId, status]
    );

    await client.query('COMMIT');
    return orderId;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Dipasang di /admin/orders bersama routes/admin/orders.js. requireAdmin per route, bukan router.use,
// supaya request lain ke /admin/orders tidak dicek dua kali (setiap cek = satu query ke admin_users).
router.post('/', requireAdmin, validate(maclabOrderCreate), async (req, res, next) => {
  try {
    let id;
    for (let attempt = 1; ; attempt++) {
      try {
        id = await createMaclabOrder(req.body, req.admin.id);
        break;
      } catch (err) {
        if (err.code === '23505' && attempt < 3) continue; // kode atau token bentrok: ulang
        throw err;
      }
    }
    // Balasan sama dengan GET /admin/orders/:id (openapi: OrderDetail).
    res.status(201).json(await loadDetail(pool, id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;