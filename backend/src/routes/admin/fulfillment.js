// Kirim tagihan, tandai pengiriman terkirim, dan Selesai (Rama).
// Dipasang di /admin; requireAdmin per route (sesi admin hanya dicek sekali).
const express = require('express');
const pool = require('../../db/pool');
const { frontendOrigin } = require('../../config/env');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { payDeadline } = require('../../services/paymentDeadline');
const { waLink } = require('../../services/waLink');
const { assertCanSendBill, assertCanDeliver, assertCanComplete } = require('../../services/fulfillmentRules');
const { deliveryUpdate } = require('../../validators/delivery');
const { withOrder, loadDetail } = require('./orders'); // transaksi + detail yang sama dengan dasbor

const router = express.Router();
const MAX_INT = 2147483647;
const rp = require('../../utils/rupiah');
const notFound = (what) => httpError(404, 'NOT_FOUND', `${what} tidak ditemukan`);

// Kirim Tagihan: catat waktu; bayar di muka memulai batas 4 jam. Status tidak berubah.
router.post('/orders/:id(\\d+)/send-bill', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id > MAX_INT) throw notFound('Pesanan');
    const { invoice_sent_at, pay_deadline_at, wa_link } = await withOrder(id, async (db, o) => {
      assertCanSendBill(o.status);
      const { rows } = await db.query('UPDATE orders SET invoice_sent_at = now() WHERE id = $1 RETURNING invoice_sent_at', [o.id]);
      const sentAt = rows[0].invoice_sent_at;
      await db.query(
        `INSERT INTO order_events (order_id, admin_id, event_type, from_status, to_status) VALUES ($1, $2, 'bill_sent', $3, $3)`,
        [o.id, req.admin.id, o.status]
      );
      const { totals } = await loadDetail(db, o.id);
      const base = (frontendOrigin || '').replace(/\/$/, ''); // domain macymoo-web
      const nama = o.customer_name ? ` ${o.customer_name}` : '';
      const link = base ? ` Detail dan cara bayar: ${base}/s/${o.public_token}` : '';
      return {
        invoice_sent_at: sentAt,
        pay_deadline_at: payDeadline({ ...o, invoice_sent_at: sentAt }),
        wa_link: waLink(o.phone, `Halo Kak${nama}, tagihan pesanan ${o.order_code} sebesar ${rp(totals.balance_due)}.${link} Terima kasih!`),
      };
    });
    res.json({ invoice_sent_at, pay_deadline_at, wa_link });
  } catch (err) {
    next(err);
  }
});

// Tandai satu pengiriman Terkirim (hanya pesanan Diproses).
router.patch('/deliveries/:id(\\d+)', requireAdmin, validate(deliveryUpdate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id > MAX_INT) throw notFound('Pengiriman');
    const found = await pool.query('SELECT order_id FROM deliveries WHERE id = $1', [id]);
    if (!found.rows[0]) throw notFound('Pengiriman');

    const { detail } = await withOrder(found.rows[0].order_id, async (db, o) => {
      const { rows } = await db.query('SELECT delivery_status FROM deliveries WHERE id = $1', [id]);
      assertCanDeliver(o.status, rows[0].delivery_status);
      await db.query(`UPDATE deliveries SET delivery_status = 'terkirim', delivered_at = now() WHERE id = $1`, [id]);
      await db.query(
        `INSERT INTO order_events (order_id, delivery_id, admin_id, event_type, from_status, to_status) VALUES ($1, $2, $3, 'delivery_delivered', $4, $4)`,
        [o.id, id, req.admin.id, o.status]
      );
    });
    res.json(detail.deliveries.find((d) => d.id === id));
  } catch (err) {
    next(err);
  }
});

// Selesai: hanya dari Diproses dan semua pengiriman sudah Terkirim.
router.post('/orders/:id(\\d+)/complete', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id > MAX_INT) throw notFound('Pesanan');
    const { detail } = await withOrder(id, async (db, o) => {
      const { rows } = await db.query(`SELECT count(*)::int AS pending FROM deliveries WHERE order_id = $1 AND delivery_status <> 'terkirim'`, [o.id]);
      assertCanComplete(o.status, rows[0].pending);
      await db.query(`UPDATE orders SET status = 'selesai' WHERE id = $1`, [o.id]);
      await db.query(
        `INSERT INTO order_events (order_id, admin_id, event_type, from_status, to_status) VALUES ($1, $2, 'completed', $3, 'selesai')`,
        [o.id, req.admin.id, o.status]
      );
    });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
