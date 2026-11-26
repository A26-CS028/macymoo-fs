// Ulasan publik (openapi: GET /reviews, POST /reviews/{token}). Token dibuat saat pesanan Selesai
// (fulfillment.js) dan berlaku 7 hari; satu pesanan satu ulasan, tampil setelah lolos moderasi.
const express = require('express');
const Joi = require('joi');
const pool = require('../../db/pool');
const rateLimit = require('../../middleware/rateLimit');
const validate = require('../../middleware/validate');
const verifyTurnstile = require('../../middleware/turnstile');
const { httpError } = require('../../middleware/errorHandler');

const router = express.Router();

const reviewCreate = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().label('Rating')
    .messages({ 'number.base': 'Pilih 1 sampai 5 bintang', 'number.min': 'Pilih 1 sampai 5 bintang', 'number.max': 'Pilih 1 sampai 5 bintang', 'number.integer': 'Pilih 1 sampai 5 bintang', 'any.required': 'Pilih 1 sampai 5 bintang' }),
  comment: Joi.string().trim().max(200).allow('').label('Komentar').messages({ 'string.max': 'Komentar maksimal 200 karakter' }),
  turnstile_token: Joi.string().min(1).max(2048).required().label('Verifikasi keamanan'),
}).prefs({ errors: { wrap: { label: false } } });

router.get('/reviews', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, rating, comment, created_at FROM reviews
        WHERE moderation_status = 'approved' AND rating IS NOT NULL ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/reviews/:token',
  rateLimit({ name: 'review', max: 10, windowMs: 10 * 60 * 1000 }),
  validate(reviewCreate),
  verifyTurnstile,
  async (req, res, next) => {
    try {
      // Satu UPDATE bersyarat: dua kiriman bersamaan tidak bisa sama-sama lolos
      const { rows } = await pool.query(
        `UPDATE reviews SET rating = $2, comment = $3, created_at = now(), moderation_status = 'pending'
          WHERE token = $1 AND rating IS NULL AND token_expires_at > now()
        RETURNING id, rating, comment, created_at`,
        [req.params.token, req.body.rating, req.body.comment || null]
      );
      if (rows[0]) return res.status(201).json(rows[0]);
      const found = await pool.query('SELECT rating, token_expires_at <= now() AS expired FROM reviews WHERE token = $1', [req.params.token]);
      const r = found.rows[0];
      if (!r) throw httpError(404, 'NOT_FOUND', 'Link ulasan tidak ditemukan');
      if (r.rating !== null) throw httpError(409, 'REVIEW_ALREADY_SUBMITTED', 'Ulasan untuk pesanan ini sudah dikirim. Terima kasih!');
      throw httpError(409, 'REVIEW_TOKEN_EXPIRED', 'Link ulasan sudah lewat 7 hari. Terima kasih sudah memesan Macyourmoo!');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
