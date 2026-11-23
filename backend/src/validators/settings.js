// Skema PUT /admin/settings (docs/openapi.yaml, komponen Settings).
// Mengganti seluruh objek: field yang tidak dikirim atau string kosong dianggap null.
const Joi = require('joi');

const teks = (max) => Joi.string().trim().max(max).allow(null).empty('').default(null);

const settingsUpdate = Joi.object({
  bank_name: teks(60),
  bank_account_number: teks(40),
  bank_account_holder: teks(100),
  qris_image_url: Joi.string().trim().uri({ scheme: 'https' }).allow(null).empty('').default(null),
  wa_number: Joi.string()
    .trim()
    .pattern(/^62[0-9]{8,13}$/)
    .allow(null)
    .empty('')
    .default(null)
    .messages({ 'string.pattern.base': 'Nomor WhatsApp hanya angka dan diawali 62, contoh 6281200000000' }),
});

module.exports = { settingsUpdate };
