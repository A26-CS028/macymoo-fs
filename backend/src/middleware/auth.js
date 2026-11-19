const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { jwtSecret } = require('../config/env');
const { httpError } = require('./errorHandler');

const COOKIE_NAME = 'macymoo_admin';
const unauthorized = () => httpError(401, 'UNAUTHORIZED', 'Sesi tidak valid. Silakan masuk lagi.');

// Lindungi semua route admin: cookie JWT wajib sah DAN akun admin masih ada.
// Tanpa cek database, admin yang sudah dihapus tetap bisa masuk sampai token kedaluwarsa (7 hari).
async function requireAdmin(req, res, next) {
  let payload;
  try {
    payload = jwt.verify(req.cookies?.[COOKIE_NAME] || '', jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return next(unauthorized());
  }
  try {
    const { rows } = await pool.query('SELECT id, username FROM admin_users WHERE id = $1', [Number(payload.sub)]);
    if (!rows[0]) return next(unauthorized());
    req.admin = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { COOKIE_NAME, requireAdmin };
