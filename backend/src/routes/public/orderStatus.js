// Halaman status dan tagihan pelanggan: GET /orders/status/:token (openapi PublicOrder).
const express = require('express');
const pool = require('../../db/pool');
const rateLimit = require('../../middleware/rateLimit');
const { httpError } = require('../../middleware/errorHandler');
const { loadDetail } = require('../admin/orders');
const { KEYS, rowsToSettings } = require('../../services/settings');
const { waLink } = require('../../services/waLink');

const router = express.Router();
const notFound = () => httpError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan');

// Detail admin -> tampilan publik: tanpa nama, nomor HP, alamat, label MooLabel, pembayaran, dan riwayat admin.
function toPublic(d, settings) {
  const tampilBayar = !['menunggu_konfirmasi', 'dibatalkan'].includes(d.status);
  const { wa_number, ...bank } = settings;
  return {
    order_code: d.order_code,
    public_token: d.public_token,
    status: d.status,
    pay_status: d.pay_status,
    pay_timing: d.pay_timing,
    pay_deadline_at: d.pay_deadline_at,
    payment_overdue: d.payment_overdue,
    deliveries: d.deliveries.map(({ address, ...x }) => x),
    items: d.items.map(({ labels, note_flags, ...x }) => x),
    totals: d.totals,
    ...(tampilBayar && { payment_info: { ...bank, wa_number } }),
    wa_link: waLink(wa_number, `Halo Kak Nabila, saya mau tanya pesanan dengan kode ${d.order_code}`),
    created_at: d.created_at,
  };
}

router.get('/orders/status/:token', rateLimit({ name: 'order_status', max: 60, windowMs: 10 * 60 * 1000 }), async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw notFound(); // bentuk salah: tidak perlu ke database
    const { rows } = await pool.query('SELECT id FROM orders WHERE public_token = $1', [token]);
    if (!rows[0]) throw notFound();
    const detail = await loadDetail(pool, rows[0].id);
    const settings = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [KEYS]);
    res.set('Cache-Control', 'no-store').json(toPublic(detail, rowsToSettings(settings.rows)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.toPublic = toPublic;
