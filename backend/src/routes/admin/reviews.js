// Moderasi ulasan (openapi: GET /admin/reviews, PATCH /admin/reviews/{id}).
// Nabila hanya menolak spam, kata kasar, atau data pribadi; bukan ulasan negatif.
const express = require('express');
const Joi = require('joi');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAdmin);

const STATUS = ['pending', 'approved', 'rejected'];
const moderate = Joi.object({ moderation_status: Joi.string().valid('approved', 'rejected').required() });
const SELECT = `SELECT r.id, o.order_code, r.rating, r.comment, r.moderation_status, r.created_at
                  FROM reviews r JOIN orders o ON o.id = r.order_id`;

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status !== undefined && !STATUS.includes(status)) {
      throw httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'status', message: 'status tidak dikenal' }]);
    }
    // Token yang belum dipakai (rating kosong) bukan ulasan, jadi tidak ikut
    const { rows } = await pool.query(
      `${SELECT} WHERE r.rating IS NOT NULL AND ($1::text IS NULL OR r.moderation_status = $1) ORDER BY r.created_at DESC LIMIT 200`,
      [status ?? null]
    );
    res.json({ reviews: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id(\\d+)', validate(moderate), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = id > 2147483647 ? { rowCount: 0 } : await pool.query(
      'UPDATE reviews SET moderation_status = $2 WHERE id = $1 AND rating IS NOT NULL', [id, req.body.moderation_status]
    );
    if (!rowCount) throw httpError(404, 'NOT_FOUND', 'Ulasan tidak ditemukan');
    const { rows } = await pool.query(`${SELECT} WHERE r.id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
