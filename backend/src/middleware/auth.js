const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { httpError } = require('./errorHandler');

const COOKIE_NAME = 'macymoo_admin';

// Lindungi semua route admin: cookie JWT wajib ada dan sah, selain itu 401.
function requireAdmin(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies?.[COOKIE_NAME] || '', jwtSecret, { algorithms: ['HS256'] });
    req.admin = { id: Number(payload.sub), username: payload.username };
    next();
  } catch {
    next(httpError(401, 'UNAUTHORIZED', 'Sesi tidak valid. Silakan masuk lagi.'));
  }
}

module.exports = { COOKIE_NAME, requireAdmin };
