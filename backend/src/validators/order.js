const Joi = require('joi');
const { isValidDate, tomorrowJakarta } = require('../utils/date');

const messages = {
  'any.required': '{#label} wajib diisi',
  'string.base': '{#label} harus berupa teks',
  'string.empty': '{#label} wajib diisi',
  'string.min': '{#label} minimal {#limit} karakter',
  'string.max': '{#label} maksimal {#limit} karakter',
  'string.pattern.base': '{#label} tidak valid',
  'number.base': '{#label} harus berupa angka',
  'number.integer': '{#label} harus bilangan bulat',
  'number.positive': '{#label} tidak valid',
  'number.min': '{#label} minimal {#limit}',
  'number.max': '{#label} maksimal {#limit}',
  'array.base': '{#label} tidak valid',
  'array.min': '{#label} minimal {#limit} isi',
  'boolean.base': '{#label} tidak valid',
  'any.only': '{#label} tidak valid',
};

const deliveryDate = Joi.string()
  .required()
  .label('Tanggal kirim')
  .custom((value, helpers) => {
    if (!isValidDate(value)) return helpers.error('date.invalid');
    if (value < tomorrowJakarta()) return helpers.error('date.tooEarly');
    return value;
  })
  .messages({
    'date.invalid': 'Tanggal kirim tidak valid (format YYYY-MM-DD)',
    'date.tooEarly': 'Tanggal kirim paling cepat besok',
  });

const qtyMessage = 'Jumlah porsi harus bilangan bulat 1 sampai 50';

const publicOrderCreate = Joi.object({
  customer_name: Joi.string().trim().min(1).max(100).required().label('Nama'),
  phone: Joi.string()
    .trim()
    .pattern(/^(?:\+62|62|0)8[0-9]{8,12}$/)
    .required()
    .label('Nomor HP')
    .messages({ 'string.pattern.base': 'Nomor HP tidak valid. Contoh: 081234567890' }),
  delivery_date: deliveryDate,
  method: Joi.string().valid('antar_nabila', 'ambil_sendiri').required().label('Cara antar'),
  address: Joi.when('method', {
    is: 'antar_nabila',
    then: Joi.string().trim().min(1).max(300).required().label('Alamat'),
    otherwise: Joi.any().strip(), // Ambil Sendiri: alamat diabaikan, tidak disimpan
  }),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        menu_id: Joi.number().integer().positive().required().label('Menu'),
        qty: Joi.number().integer().min(1).max(50).required().label('Jumlah porsi').messages({
          'number.base': qtyMessage,
          'number.integer': qtyMessage,
          'number.min': qtyMessage,
          'number.max': qtyMessage,
        }),
        option_ids: Joi.array().items(Joi.number().integer().positive()).default([]).label('Opsi'),
        note: Joi.string().trim().max(500).allow('').label('Catatan'),
      })
    )
    .required()
    .label('Item pesanan'),
  agree_rules: Joi.boolean().valid(true).required().label('Persetujuan aturan').messages({
    'any.only': 'Anda harus menyetujui Aturan Pemesanan',
    'any.required': 'Anda harus menyetujui Aturan Pemesanan',
  }),
  turnstile_token: Joi.string().min(1).required().label('Verifikasi keamanan'),
  website: Joi.string().valid('').label('website').messages({ 'any.only': 'Permintaan tidak valid' }), // honeypot
}).prefs({ errors: { wrap: { label: false } }, messages });

module.exports = { publicOrderCreate };