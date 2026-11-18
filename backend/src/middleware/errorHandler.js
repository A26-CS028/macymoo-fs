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
  // Hanya error dengan status eksplisit (httpError, body-parser) yang pesannya boleh sampai ke klien.
  // Error pg dan sistem juga punya err.code ('23505', 'ETIMEDOUT'), jadi code tidak bisa jadi penanda.
  const unexpected = !(err.status || err.statusCode);
  if (unexpected) console.error(err);
  res.status(status).json({
    error: {
      code: unexpected ? 'INTERNAL_ERROR' : err.code || DEFAULT_CODES[status] || 'INTERNAL_ERROR',
      message: unexpected ? 'Terjadi kesalahan di server' : err.message,
      ...(err.details && { details: err.details }),
    },
  });
}

module.exports = { httpError, errorHandler };
