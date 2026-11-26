// Query rekap (GET /admin/recap dan /admin/recap/export.xlsx): from, to, period wajib.
const Joi = require('joi');

const MAX_DAYS = 366;
const DAY_MS = 86400000;
const toMs = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// Tanggal harus nyata: 2026-02-31 ditolak.
const ymd = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((v, helpers) => {
    const ms = toMs(v);
    return new Date(ms).toISOString().slice(0, 10) === v ? v : helpers.error('date.base');
  })
  .required()
  .messages({
    'any.required': '{{#label}} wajib diisi',
    'string.empty': '{{#label}} wajib diisi',
    'string.base': '{{#label}} harus berupa tanggal YYYY-MM-DD',
    'string.pattern.base': '{{#label}} harus berformat YYYY-MM-DD',
    'date.base': '{{#label}} bukan tanggal yang valid',
  });

const recapQuery = Joi.object({
  from: ymd,
  to: ymd,
  period: Joi.string().valid('daily', 'weekly').required().messages({
    'any.required': 'period wajib diisi',
    'any.only': 'period harus daily atau weekly',
    'string.empty': 'period wajib diisi',
  }),
})
  .custom((v, helpers) => {
    if (v.to < v.from) return helpers.message('to tidak boleh sebelum from');
    if ((toMs(v.to) - toMs(v.from)) / DAY_MS + 1 > MAX_DAYS) return helpers.message(`rentang maksimal ${MAX_DAYS} hari`);
    return v;
  });

module.exports = { recapQuery, MAX_DAYS };