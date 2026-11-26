const express = require('express');
const pool = require('../../db/pool');
const { calculateOrder } = require('../../services/pricing');
const { publicToken, orderCode } = require('../../services/token');
const { waLink } = require('../../services/waLink');
const { labelItems } = require('../../services/aiClient');
const rateLimit = require('../../middleware/rateLimit');
const validate = require('../../middleware/validate');
const verifyTurnstile = require('../../middleware/turnstile');
const { publicOrderCreate } = require('../../validators/order');
const { httpError } = require('../../middleware/errorHandler');

const router = express.Router();

async function createOrder(body) {
  const client = await pool.connect();
  let broken; // ROLLBACK gagal = koneksi rusak, release(err) membuangnya dari pool
  try {
    await client.query('BEGIN');

    const closed = await client.query('SELECT 1 FROM closed_dates WHERE closed_date = $1', [body.delivery_date]);
    if (closed.rowCount > 0) {
      throw httpError(409, 'DATE_CLOSED', 'Tanggal itu sedang ditutup. Silakan pilih tanggal lain.');
    }

    // katalog dari database; harga dari browser tidak dipakai
    const menuIds = [...new Set(body.items.map((i) => i.menu_id))];
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

    const { items: priced, totals } = calculateOrder(
      {
        items: body.items.map((i) => ({
          delivery_index: 0,
          item_type: 'menu',
          menu_id: i.menu_id,
          qty: i.qty,
          option_ids: i.option_ids,
        })),
        deliveries: [{ method: body.method, shipping_fee: body.method === 'antar_nabila' ? null : 0 }],
        status: 'menunggu_konfirmasi',
      },
      { menus, options }
    );

    // paling banyak satu opsi per option_group
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

    const code = orderCode();
    const token = publicToken();

    const orderRes = await client.query(
      `INSERT INTO orders (order_code, customer_name, phone, source, public_token)
       VALUES ($1, $2, $3, 'web_form', $4) RETURNING id, created_at`,
      [code, body.customer_name, body.phone, token]
    );
    const orderId = orderRes.rows[0].id;

    const delRes = await client.query(
      `INSERT INTO deliveries (order_id, delivery_date, method, address)
       VALUES ($1, $2, $3, $4) RETURNING id, delivery_status, delivered_at`,
      [orderId, body.delivery_date, body.method, body.method === 'antar_nabila' ? body.address : null]
    );
    const delivery = delRes.rows[0];

    const outItems = [];
    for (let i = 0; i < priced.length; i++) {
      const it = priced[i];
      const note = body.items[i].note || null;
      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, delivery_id, menu_id, item_type, qty, unit_price, note)
         VALUES ($1, $2, $3, 'menu', $4, $5, $6) RETURNING id`,
        [orderId, delivery.id, it.menu_id, it.qty, it.unit_price, note]
      );
      const itemId = itemRes.rows[0].id;
      for (const o of it.options) {
        await client.query(
          `INSERT INTO order_item_options (order_item_id, menu_option_id, extra_price) VALUES ($1, $2, $3)`,
          [itemId, o.menu_option_id, o.extra_price]
        );
      }
      outItems.push({
        id: itemId,
        delivery_id: delivery.id,
        item_type: 'menu',
        menu_id: it.menu_id,
        name: menus.get(it.menu_id).name,
        unit_price: it.unit_price,
        qty: it.qty,
        line_total: it.line_total,
        options: it.options.map((o) => ({
          menu_option_id: o.menu_option_id,
          name: options.get(o.menu_option_id).name,
          option_group: options.get(o.menu_option_id).option_group,
          extra_price: o.extra_price,
        })),
        note,
      });
    }

    await client.query(
      `INSERT INTO order_events (order_id, event_type, to_status) VALUES ($1, 'order_created', 'menunggu_konfirmasi')`,
      [orderId]
    );

    const wa = await client.query(`SELECT value FROM settings WHERE key = 'wa_number'`);
    await client.query('COMMIT');

    const { per_delivery, ...publicTotals } = totals;
    return {
      order_code: code,
      public_token: token,
      status: 'menunggu_konfirmasi',
      pay_status: 'belum_bayar',
      pay_timing: 'di_muka',
      pay_deadline_at: null,
      payment_overdue: false,
      deliveries: [
        {
          id: delivery.id,
          delivery_date: body.delivery_date,
          method: body.method,
          shipping_fee: 0,
          delivery_status: delivery.delivery_status,
          delivered_at: delivery.delivered_at,
        },
      ],
      items: outItems,
      totals: publicTotals,
      wa_link: waLink(wa.rows[0]?.value, `Halo Kak Nabila, saya sudah pesan dengan kode ${code}`),
      created_at: orderRes.rows[0].created_at,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch((e) => { broken = e; });
    throw err;
  } finally {
    client.release(broken);
  }
}

router.post(
  '/orders',
  rateLimit({ name: 'order', max: 20, windowMs: 10 * 60 * 1000 }),
  validate(publicOrderCreate),
  verifyTurnstile,
  async (req, res, next) => {
    try {
      let result;
      for (let attempt = 1; ; attempt++) {
        try {
          result = await createOrder(req.body);
          break;
        } catch (err) {
          if (err.code === '23505' && attempt < 3) continue; // kode atau token bentrok: ulang
          throw err;
        }
      }
      // ditunggu sebelum membalas: di Vercel proses berhenti setelah respons terkirim
      await labelItems(result.items.map((it) => ({ order_item_id: it.id, note: it.note })));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;