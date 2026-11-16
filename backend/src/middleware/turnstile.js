const { turnstileSecret } = require('../config/env');
const { httpError } = require('./errorHandler');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verifikasi token Cloudflare Turnstile (req.body.turnstile_token) di server. Token sekali pakai.
// Pasang setelah validate(): token baru dihabiskan bila isi form sudah valid.
module.exports = async function turnstile(req, res, next) {
  try {
    if (!turnstileSecret) throw new Error('TURNSTILE_SECRET_KEY belum diisi');
    const body = new URLSearchParams({ secret: turnstileSecret, response: req.body.turnstile_token || '' });
    if (req.ip) body.set('remoteip', req.ip);
    const result = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) }).then((r) => r.json());
    if (!result.success) {
      return next(httpError(400, 'TURNSTILE_FAILED', 'Verifikasi keamanan gagal. Muat ulang verifikasi lalu coba lagi.'));
    }
    delete req.body.turnstile_token;
    next();
  } catch (err) {
    next(err);
  }
};
