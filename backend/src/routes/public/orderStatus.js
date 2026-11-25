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
// review: baris tabel reviews pesanan ini (atau undefined).
function toPublic(d, settings, review) {
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
    // Link ulasan hanya untuk pesanan Selesai yang belum diulas dan tokennya masih berlaku
    review: d.status === 'selesai' && review && review.rating === null && new Date(review.token_expires_at) > new Date()
      ? { token: review.token, expires_at: review.token_expires_at } : null,
    created_at: d.created_at,
  };
}

router.get('/orders/status/:token', rateLimit({ name: 'order_status', max: 300, windowMs: 10 * 60 * 1000 }) /* satu IP bisa dipakai banyak pelanggan (Wi-Fi kampus) */, async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw notFound(); // bentuk salah: tidak perlu ke database
    const { rows } = await pool.query('SELECT id FROM orders WHERE public_token = $1', [token]);
    if (!rows[0]) throw notFound();
    const detail = await loadDetail(pool, rows[0].id);
    const settings = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [KEYS]);
    const review = await pool.query('SELECT token, token_expires_at, rating FROM reviews WHERE order_id = $1', [rows[0].id]);
    res.set('Cache-Control', 'no-store').json(toPublic(detail, rowsToSettings(settings.rows), review.rows[0]));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.toPublic = toPublic;
