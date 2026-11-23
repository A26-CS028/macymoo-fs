const express = require('express');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { settingsUpdate } = require('../../validators/settings');
const { KEYS, rowsToSettings, settingsToRows } = require('../../services/settings');

const router = express.Router();

// Semua route di file ini hanya untuk admin yang sudah masuk (selain itu 401).
router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [KEYS]);
    res.json(rowsToSettings(rows));
  } catch (err) {
    next(err);
  }
});

// Nilai null disimpan sebagai NULL (= belum diisi). Satu UPSERT sudah atomik, jadi tanpa transaksi.
router.put('/', validate(settingsUpdate), async (req, res, next) => {
  try {
    const rows = settingsToRows(req.body);
    await pool.query(
      `INSERT INTO settings (key, value) SELECT * FROM unnest($1::text[], $2::text[])
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [rows.map(([k]) => k), rows.map(([, v]) => v)]
    );
    res.json(Object.fromEntries(rows));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
