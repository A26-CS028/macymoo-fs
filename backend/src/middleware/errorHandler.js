// Format error sesuai kontrak API: { error: { code, message, details } }
const DEFAULT_CODES = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  503: 'AI_UNAVAILABLE',
};

function httpError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  // Error tak terduga (tanpa kode) dicatat dan pesannya disembunyikan; error yang sengaja dibuat (httpError) ditampilkan
  const unexpected = status >= 500 && !err.code;
  if (unexpected) console.error(err);
  res.status(status).json({
    error: {
      code: err.code || DEFAULT_CODES[status] || 'INTERNAL_ERROR',
      // pesan error server tidak dikirim ke klien supaya detail internal tidak bocor
      message: unexpected ? 'Terjadi kesalahan di server' : err.message,
      ...(err.details && { details: err.details }),
    },
  });
}

module.exports = { httpError, errorHandler };
