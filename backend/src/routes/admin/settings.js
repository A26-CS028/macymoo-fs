const express = require('express');
const pool = require('../../db/pool');
const validate = require('../../middleware/validate');
const { requireAdmin } = require('../../middleware/auth');
const { settingsUpdate } = require('../../validators/settings');
const { KEYS, rowsToSettings, settingsToRows } = require('../../services/settings');

const router = express.Router();

// Semua route di file ini hanya untuk admin yang sudah masuk (selain itu 401).
router.use(requireAdmin);

async function readSettings(db) {
  const { rows } = await db.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [KEYS]);
  return rowsToSettings(rows);
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await readSettings(pool));
  } catch (err) {
    next(err);
  }
});

// PUT mengganti seluruh objek: nilai null menghapus baris, sisanya di-upsert. Satu transaksi.
router.put('/', validate(settingsUpdate), async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const rows = settingsToRows(req.body);
    const filled = rows.filter(([, v]) => v !== null);
    const emptied = rows.filter(([, v]) => v === null).map(([k]) => k);
    if (emptied.length) await client.query('DELETE FROM settings WHERE key = ANY($1::text[])', [emptied]);
    if (filled.length) {
      await client.query(
        `INSERT INTO settings (key, value) SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [filled.map(([k]) => k), filled.map(([, v]) => v)]
      );
    }
    const saved = await readSettings(client);
    await client.query('COMMIT');
    res.json(saved);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;