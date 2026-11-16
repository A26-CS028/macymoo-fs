const express = require('express');
const validate = require('../../middleware/validate');
const rateLimit = require('../../middleware/rateLimit');
const turnstile = require('../../middleware/turnstile');
const { orderSchema } = require('../../validators/order');
const { httpError } = require('../../middleware/errorHandler');

const router = express.Router();

// Pintu masuk POST /orders (Darnell): rate limit longgar (banyak pengguna HP berbagi IP, KF 12),
// validasi Joi + honeypot, lalu Turnstile. Urutan ini membuat token Turnstile hanya dipakai untuk form yang sudah valid.
const guards = [
  rateLimit({ name: 'order', max: 10, windowMs: 60 * 60 * 1000 }),
  validate(orderSchema),
  turnstile,
];

// shortcut: penyimpanan pesanan (harga dari DB, kode pesanan, token, insert) dikerjakan Rama
// di handler ini; sampai saat itu endpoint membalas 501 setelah semua pemeriksaan di atas lolos.
function createOrder(req, res, next) {
  next(httpError(501, 'NOT_IMPLEMENTED', 'Penyimpanan pesanan belum tersedia'));
}

router.post('/', ...guards, createOrder);

module.exports = router;
