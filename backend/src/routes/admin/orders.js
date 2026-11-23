// Dasbor pesanan (Darnell): daftar, cari, filter, detail, konfirmasi (ongkir, waktu bayar, diskon),
// jadwal ulang, dan batal. Dipasang di /admin/orders bersama MacLab (routes/admin/maclab.js, POST /).
const express = require('express');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { computeTotals } = require('../../services/pricing');
const { nextStatus, RESCHEDULABLE } = require('../../services/orderStatus');
const { waLink } = require('../../services/waLink');
const { payDeadline, isOverdue } = require('../../services/paymentDeadline');
const { displayNo } = require('../../services/invoiceNumber');
const { confirmOrder, rescheduleOrder, cancelOrder, listQuery } = require('../../validators/adminOrder');

const router = express.Router();
router.use(requireAdmin);
// id di luar batas INTEGER Postgres = pasti tidak ada (tanpa ini query gagal jadi 500)
router.param('id', (req, res, next, id) => (Number(id) > 2147483647 ? next(httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan')) : next()));

// Total pesanan lewat modul harga yang sama dengan pembuatan pesanan.
// Antar Nabila yang belum dikonfirmasi = ongkir belum diisi (shipping_pending).
function totalsOf(order, deliveries, items, payments = []) {
  const index = new Map(deliveries.map((d, i) => [d.id, i]));
  const totals = computeTotals({
    items: items.map((it) => ({ delivery_index: index.get(it.delivery_id), line_total: it.line_total })),
    deliveries: deliveries.map((d) => ({
      method: d.method,
      shipping_fee: d.method === 'antar_nabila' && order.status === 'menunggu_konfirmasi' ? null : d.shipping_fee,
    })),
    discount: order.discount,
    payments,
    status: order.status,
  });
  delete totals.per_delivery;
  return totals;
}

// Item beserta total baris (harga yang disalin saat pesan + opsi)
async function loadItems(db, orderIds) {
  const { rows } = await db.query(
    `SELECT oi.id, oi.order_id, oi.delivery_id, oi.item_type, oi.menu_id, COALESCE(m.name, oi.custom_name) AS name,
            oi.unit_price, oi.qty, oi.note, COALESCE(SUM(oio.extra_price), 0)::int AS extra
       FROM order_items oi
       LEFT JOIN menus m ON m.id = oi.menu_id
       LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
      WHERE oi.order_id = ANY($1::int[])
      GROUP BY oi.id, m.name
      ORDER BY oi.id`,
    [orderIds]
  );
  return rows.map((r) => ({ ...r, line_total: r.qty * (r.unit_price + r.extra) }));
}

async function loadDeliveries(db, orderIds) {
  const { rows } = await db.query(
    // ::text supaya tanggal tidak bergeser oleh zona waktu server (pg mengubah DATE jadi Date lokal)
    `SELECT id, order_id, delivery_date::text, method, address, shipping_fee, delivery_status, delivered_at
       FROM deliveries WHERE order_id = ANY($1::int[]) ORDER BY delivery_date, id`,
    [orderIds]
  );
  return rows;
}

function listItem(o, deliveries, items) {
  // Kolom Menu: jumlah per nama di semua pengiriman, urut item pertama dibuat
  const summary = new Map();
  for (const it of items) summary.set(it.name, (summary.get(it.name) || 0) + it.qty);
  return {
    id: o.id,
    order_code: o.order_code,
    customer_name: o.customer_name,
    phone: o.phone,
    source: o.source,
    status: o.status,
    pay_status: o.pay_status,
    delivery_dates: [...new Set(deliveries.map((d) => d.delivery_date))],
    delivery_methods: [...new Set(deliveries.map((d) => d.method))],
    items_summary: [...summary].map(([name, qty]) => ({ name, qty })),
    grand_total: totalsOf(o, deliveries, items).grand_total,
    payment_overdue: isOverdue(o),
    created_at: o.created_at,
  };
}

// Pencarian nomor HP: 08… dan +62… disamakan dengan format simpan 62…
function phoneTerm(q) {
  const digits = q.replace(/[\s-]/g, '');
  if (!/^\+?\d{3,}$/.test(digits)) return null;
  return digits.replace(/^\+/, '').replace(/^0/, '62');
}
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

router.get('/', async (req, res, next) => {
  try {
    const { error, value: f } = listQuery.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));

    const where = [];
    const params = [];
    const add = (v) => { params.push(v); return `$${params.length}`; };
    if (f.status) where.push(`o.status = ${add(f.status)}`);
    if (f.date) where.push(`EXISTS (SELECT 1 FROM deliveries d WHERE d.order_id = o.id AND d.delivery_date = ${add(f.date)})`);
    if (f.q) {
      const like = add(`%${likeEscape(f.q)}%`);
      const or = [`o.order_code ILIKE ${like}`, `o.customer_name ILIKE ${like}`];
      const phone = phoneTerm(f.q);
      if (phone) or.push(`o.phone LIKE ${add(`%${phone}%`)}`);
      where.push(`(${or.join(' OR ')})`);
    }
    // shortcut: maksimal 500 pesanan terbaru tanpa paginasi server; tambah paginasi bila volume Nabila jauh melampaui ini.
    const { rows: orders } = await pool.query(
      `SELECT o.* FROM orders o ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY o.created_at DESC, o.id DESC LIMIT 500`,
      params
    );
    const ids = orders.map((o) => o.id);
    const [deliveries, items] = await Promise.all([loadDeliveries(pool, ids), loadItems(pool, ids)]);
    res.json({
      orders: orders.map((o) => listItem(o, deliveries.filter((d) => d.order_id === o.id), items.filter((it) => it.order_id === o.id))),
    });
  } catch (err) {
    next(err);
  }
});

// Detail lengkap (openapi: OrderDetail). db = pool atau client transaksi.
async function loadDetail(db, id) {
  const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  const o = rows[0];
  if (!o) throw httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan');

  // Berurutan, bukan Promise.all: db bisa client transaksi withOrder, dan pg tidak mengizinkan
  // query paralel di satu client (sekarang peringatan, error mulai pg@9).
  const deliveries = await loadDeliveries(db, [id]);
  const items = await loadItems(db, [id]);
  const opts = await db.query(
    `SELECT oio.order_item_id, oio.menu_option_id, mo.name, mo.option_group, oio.extra_price
       FROM order_item_options oio JOIN menu_options mo ON mo.id = oio.menu_option_id
       JOIN order_items oi ON oi.id = oio.order_item_id WHERE oi.order_id = $1 ORDER BY mo.id`,
    [id]
  );
  const labels = await db.query(
    `SELECT l.order_item_id, l.label, l.model_version FROM order_item_labels l
       JOIN order_items oi ON oi.id = l.order_item_id WHERE oi.order_id = $1`,
    [id]
  );
  const payments = await db.query('SELECT id, type, method, amount, paid_at FROM payments WHERE order_id = $1 ORDER BY paid_at, id', [id]);
  const invoices = await db.query('SELECT id, invoice_no, revision, issued_at::text FROM invoices WHERE order_id = $1 ORDER BY revision', [id]);
  const events = await db.query(
    `SELECT id, event_type, from_status, to_status, reason, delivery_id, old_date::text, new_date::text, admin_id, created_at
       FROM order_events WHERE order_id = $1 ORDER BY created_at, id`,
    [id]
  );

  const deadline = payDeadline(o);
  return {
    ...listItem(o, deliveries, items),
    public_token: o.public_token,
    pay_timing: o.pay_timing,
    discount: o.discount,
    invoice_sent_at: o.invoice_sent_at,
    pay_deadline_at: deadline,
    deliveries: deliveries.map(({ order_id, ...d }) => d),
    items: items.map(({ order_id, extra, ...it }) => ({
      ...it,
      options: opts.rows.filter((x) => x.order_item_id === it.id).map(({ order_item_id, ...x }) => x),
      labels: labels.rows.filter((x) => x.order_item_id === it.id).map(({ order_item_id, ...x }) => x),
      note_flags: [],
    })),
    payments: payments.rows,
    invoices: invoices.rows.map((i) => ({ ...i, display_no: displayNo(i.invoice_no, i.revision) })),
    events: events.rows,
    totals: totalsOf(o, deliveries, items, payments.rows),
  };
}

router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    res.json(await loadDetail(pool, Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// Jalankan perubahan dalam transaksi dengan baris pesanan dikunci (dua klik bersamaan tidak dobel)
async function withOrder(id, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan');
    const extra = await fn(client, rows[0]);
    const detail = await loadDetail(client, id);
    await client.query('COMMIT');
    return { detail, ...extra };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Konfirmasi: isi ongkir per pengiriman Antar Nabila, diskon, dan waktu bayar (KF 4 langkah 2).
router.patch('/:id(\\d+)/confirm', validate(confirmOrder), async (req, res, next) => {
  try {
    const { detail } = await withOrder(Number(req.params.id), async (db, o) => {
      const to = nextStatus(o.status, 'confirm', req.body);
      const deliveries = await loadDeliveries(db, [o.id]);
      const fees = new Map(req.body.shipping_fees.map((s) => [s.delivery_id, s.shipping_fee]));
      const errors = [];
      for (const id of fees.keys()) {
        const d = deliveries.find((x) => x.id === id);
        if (!d) errors.push({ field: 'shipping_fees', message: `Pengiriman ${id} bukan milik pesanan ini` });
        else if (d.method === 'ambil_sendiri') errors.push({ field: 'shipping_fees', message: 'Ambil Sendiri tidak dikenai ongkir' });
      }
      for (const d of deliveries) {
        if (d.method === 'antar_nabila' && !fees.has(d.id)) errors.push({ field: 'shipping_fees', message: `Ongkir pengiriman ${d.delivery_date} wajib diisi` });
      }
      if (errors.length) throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', errors);

      // Hitung ulang dengan ongkir dan diskon baru; diskon melebihi total ditolak modul harga (400)
      const items = await loadItems(db, [o.id]);
      const updated = deliveries.map((d) => ({ ...d, shipping_fee: fees.get(d.id) ?? 0 }));
      totalsOf({ ...o, status: to, discount: req.body.discount }, updated, items);

      for (const d of updated) await db.query('UPDATE deliveries SET shipping_fee = $1 WHERE id = $2', [d.shipping_fee, d.id]);
      await db.query('UPDATE orders SET status = $1, pay_timing = $2, discount = $3 WHERE id = $4', [to, req.body.pay_timing, req.body.discount, o.id]);
      await db.query(
        `INSERT INTO order_events (order_id, admin_id, event_type, from_status, to_status) VALUES ($1, $2, 'confirmed', $3, $4)`,
        [o.id, req.admin.id, o.status, to]
      );
    });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// Jadwal ulang satu pengiriman; status tidak berubah. Pelanggan dikabari lewat wa_link (KF 6).
router.post('/:id(\\d+)/reschedule', validate(rescheduleOrder), async (req, res, next) => {
  try {
    const { delivery_id, new_date, reason } = req.body;
    const { detail, wa_link } = await withOrder(Number(req.params.id), async (db, o) => {
      if (!RESCHEDULABLE.includes(o.status)) {
        throw httpError(409, 'INVALID_STATUS_TRANSITION', 'Pesanan yang sudah selesai atau dibatalkan tidak bisa dijadwalkan ulang');
      }
      const { rows } = await db.query('SELECT delivery_date::text, delivery_status FROM deliveries WHERE id = $1 AND order_id = $2', [delivery_id, o.id]);
      const d = rows[0];
      if (!d) throw httpError(404, 'NOT_FOUND', 'Pengiriman tidak ditemukan pada pesanan ini');
      if (d.delivery_status === 'terkirim') throw httpError(409, 'DELIVERY_ALREADY_DELIVERED', 'Pengiriman ini sudah terkirim');
      const oldDate = d.delivery_date;
      if (oldDate === new_date) throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'new_date', message: 'Tanggal baru sama dengan tanggal lama' }]);
      const closed = await db.query('SELECT 1 FROM closed_dates WHERE closed_date = $1', [new_date]);
      if (closed.rowCount) throw httpError(409, 'DATE_CLOSED', 'Tanggal itu sedang ditutup. Pilih tanggal lain.');

      await db.query('UPDATE deliveries SET delivery_date = $1 WHERE id = $2', [new_date, delivery_id]);
      await db.query(
        `INSERT INTO order_events (order_id, delivery_id, admin_id, event_type, old_date, new_date, reason)
         VALUES ($1, $2, $3, 'rescheduled', $4, $5, $6)`,
        [o.id, delivery_id, req.admin.id, oldDate, new_date, reason]
      );
      const nama = o.customer_name ? ` ${o.customer_name}` : '';
      return {
        wa_link: waLink(o.phone, `Halo Kak${nama}, pesanan ${o.order_code} perlu dijadwalkan ulang dari ${oldDate} ke ${new_date}. Alasan: ${reason}. Mohon balas apakah Kakak setuju. Terima kasih!`),
      };
    });
    res.json({ order: detail, wa_link });
  } catch (err) {
    next(err);
  }
});

// Batal dengan alasan (semua pembatalan dilakukan Nabila, KF 5). Bila sudah bayar, totals.refund_due terisi.
router.post('/:id(\\d+)/cancel', validate(cancelOrder), async (req, res, next) => {
  try {
    const { detail } = await withOrder(Number(req.params.id), async (db, o) => {
      const to = nextStatus(o.status, 'cancel');
      await db.query('UPDATE orders SET status = $1 WHERE id = $2', [to, o.id]);
      await db.query(
        `INSERT INTO order_events (order_id, admin_id, event_type, from_status, to_status, reason) VALUES ($1, $2, 'cancelled', $3, $4, $5)`,
        [o.id, req.admin.id, o.status, to, req.body.reason]
      );
    });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.withOrder = withOrder;
module.exports.loadDetail = loadDetail;