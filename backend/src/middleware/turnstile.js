const { turnstileSecretKey } = require('../config/env');
const { httpError } = require('./errorHandler');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const failed = () =>
  httpError(400, 'TURNSTILE_FAILED', 'Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.');

// Dipasang setelah validate(), jadi req.body.turnstile_token sudah pasti ada.
async function verifyTurnstile(req, res, next) {
  try {
    const params = new URLSearchParams({
      secret: turnstileSecretKey || '',
      response: req.body.turnstile_token,
    });
    if (req.ip) params.append('remoteip', req.ip);

    const r = await fetch(VERIFY_URL, { method: 'POST', body: params, signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    if (!data.success) return next(failed());
    next();
  } catch (err) {
    next(failed());
  }
}

module.exports = verifyTurnstile;