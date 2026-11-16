const crypto = require('crypto');
const pool = require('../db/pool');
const { jwtSecret } = require('../config/env');
const { httpError } = require('./errorHandler');

// Rate limit per IP, disimpan di tabel rate_limits karena serverless (KF 11).
// IP disimpan sebagai hash (data pribadi). Jendela tetap: hitungan direset di awal tiap jendela.
// Pakai: rateLimit({ name: 'login', max: 5, windowMs: 15 * 60 * 1000 })
module.exports = ({ name, max, windowMs }) => async (req, res, next) => {
  try {
    const now = Date.now();
    const windowStart = new Date(now - (now % windowMs));
    const ipHash = crypto.createHmac('sha256', jwtSecret).update(req.ip || '').digest('hex').slice(0, 32);
    const { rows } = await pool.query(
      `INSERT INTO rate_limits (key, window_start) VALUES ($1, $2)
       ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
       RETURNING hits`,
      [`${name}:${ipHash}`, windowStart]
    );
    // bersihkan baris lama tanpa cron; jendela terpanjang yang dipakai < 1 hari
    if (Math.random() < 0.05) {
      pool.query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'").catch(() => {});
    }
    if (rows[0].hits > max) {
      res.set('Retry-After', String(Math.ceil((windowStart.getTime() + windowMs - now) / 1000)));
      return next(httpError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi nanti.'));
    }
    next();
  } catch (err) {
    next(err);
  }
};
