const Joi = require('joi');
const { todayJakarta, addDays } = require('../utils/date');

// Skema POST /orders (openapi: PublicOrderCreate). Harga tidak diterima dari browser.
// Pesan error berbahasa Indonesia supaya bisa langsung ditampilkan di form.

const phone = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const digits = value.replace(/[\s-]/g, '');
    // Nomor HP Indonesia: diawali 08, total 10-13 digit (sesuai petunjuk di form)
    if (!/^08\d{8,11}$/.test(digits)) return helpers.error('phone.invalid');
    return digits;
  })
  .messages({ 'phone.invalid': 'Nomor WhatsApp harus diawali 08 dan berisi 10-13 angka' });

const deliveryDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    // Paling cepat besok (H-1), dihitung dengan zona Asia/Jakarta
    if (value < addDays(todayJakarta(), 1)) return helpers.error('date.tooEarly');
    if (value > addDays(todayJakarta(), 60)) return helpers.error('date.tooFar');
    return value;
  })
  .messages({
    'string.pattern.base': 'Format tanggal kirim harus YYYY-MM-DD',
    'date.tooEarly': 'Tanggal kirim paling cepat besok. Untuk hari ini, hubungi Nabila lewat WhatsApp',
    'date.tooFar': 'Tanggal kirim paling lambat 60 hari dari sekarang',
  });

const item = Joi.object({
  menu_id: Joi.number().integer().positive().required(),
  qty: Joi.number().integer().min(1).max(50).required().messages({
    'number.min': 'Jumlah porsi minimal 1',
    'number.max': 'Jumlah porsi maksimal 50 per menu; pesanan lebih besar lewat WhatsApp',
  }),
  option_ids: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  note: Joi.string().trim().max(500).allow(''),
});

const orderSchema = Joi.object({
  customer_name: Joi.string().trim().min(1).max(100).required().messages({ 'string.empty': 'Nama wajib diisi' }),
  phone: phone.required(),
  delivery_date: deliveryDate.required(),
  method: Joi.string().valid('antar_nabila', 'ambil_sendiri').required(),
  address: Joi.when('method', {
    is: 'antar_nabila',
    then: Joi.string().trim().min(1).max(300).required().messages({ 'string.empty': 'Alamat wajib diisi bila diantar Nabila' }),
    otherwise: Joi.any().strip(), // Ambil Sendiri: alamat tidak disimpan (data seperlunya)
  }),
  items: Joi.array().items(item).min(1).required().messages({ 'array.min': 'Pilih minimal 1 menu' }),
  agree_rules: Joi.boolean().valid(true).required().messages({
    'any.only': 'Setujui Aturan Pemesanan dan Kebijakan Privasi dulu',
    'any.required': 'Setujui Aturan Pemesanan dan Kebijakan Privasi dulu',
  }),
  turnstile_token: Joi.string().min(1).required().messages({ 'any.required': 'Verifikasi Turnstile belum selesai' }),
  // Honeypot: field tersembunyi; bot yang mengisinya ditolak
  website: Joi.string().allow('').max(0).messages({ 'string.max': 'Permintaan ditolak' }),
});

module.exports = { orderSchema };
