// Tutup tanggal (openapi: POST /admin/closed-dates, DELETE /admin/closed-dates/{id}).
// Daftarnya memakai GET /closed-dates publik (tanggal hari ini ke depan).
const express = require('express');
const Joi = require('joi');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { httpError } = require('../../middleware/errorHandler');
const { isValidDate, todayJakarta } = require('../../utils/date');

const router = express.Router();
router.use(requireAdmin);

const closeDate = Joi.object({
  closed_date: Joi.string().required().label('Tanggal')
    .custom((v, h) => (!isValidDate(v) ? h.error('date.invalid') : v < todayJakarta() ? h.error('date.past') : v))
    .messages({ 'date.invalid': 'Tanggal tidak valid (format YYYY-MM-DD)', 'date.past': 'Tanggal yang sudah lewat tidak perlu ditutup', 'any.required': 'Tanggal wajib diisi' }),
});

router.post('/', validate(closeDate), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO closed_dates (closed_date) VALUES ($1) ON CONFLICT (closed_date) DO NOTHING
       RETURNING id, to_char(closed_date, 'YYYY-MM-DD') AS closed_date`,
      [req.body.closed_date]
    );
    if (!rows[0]) throw httpError(409, 'DATE_ALREADY_CLOSED', 'Tanggal itu sudah ditutup');
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = id > 2147483647 ? { rowCount: 0 } : await pool.query('DELETE FROM closed_dates WHERE id = $1', [id]);
    if (!rowCount) throw httpError(404, 'NOT_FOUND', 'Tanggal tutup tidak ditemukan');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
