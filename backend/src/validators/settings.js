// Skema PUT /admin/settings (docs/openapi.yaml, komponen Settings).
// Mengganti seluruh objek: field yang tidak dikirim atau string kosong dianggap null.
const Joi = require('joi');

const messages = {
  'string.base': '{#label} harus berupa teks',
  'string.max': '{#label} maksimal {#limit} karakter',
  'string.uri': '{#label} harus berupa tautan yang valid',
  'string.uriCustomScheme': '{#label} harus berupa tautan https',
  'string.pattern.base': '{#label} hanya angka dan diawali 62, contoh 6281200000000',
};

const opsional = (s, label) => s.trim().allow(null).empty('').default(null).label(label);

const settingsUpdate = Joi.object({
  bank_name: opsional(Joi.string().max(60), 'Nama bank'),
  bank_account_number: opsional(Joi.string().max(40), 'Nomor rekening'),
  bank_account_holder: opsional(Joi.string().max(100), 'Nama pemilik rekening'),
  qris_image_url: opsional(Joi.string().uri({ scheme: 'https' }).max(500), 'Gambar QRIS'),
  wa_number: opsional(Joi.string().pattern(/^62[0-9]{8,13}$/), 'Nomor WhatsApp'),
}).prefs({ errors: { wrap: { label: false } }, messages });

module.exports = { settingsUpdate };