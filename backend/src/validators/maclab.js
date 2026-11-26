const Joi = require('joi');
const { isValidDate, todayJakarta } = require('../utils/date');
const { phone } = require('./order');

const messages = require('./messages');

const ITEM_TYPES = ['menu', 'item_bebas', 'bundling', 'bonus', 'kolaborasi'];

// MacLab dipakai untuk pesanan mendadak hari H, jadi batasnya hari ini (bukan H-1 seperti form publik).
const deliveryDate = Joi.string()
  .required()
  .label('Tanggal kirim')
  .custom((value, helpers) => {
    if (!isValidDate(value)) return helpers.error('date.invalid');
    if (value < todayJakarta()) return helpers.error('date.past');
    return value;
  })
  .messages({
    'date.invalid': 'Tanggal kirim tidak valid (format YYYY-MM-DD)',
    'date.past': 'Tanggal kirim tidak boleh sebelum hari ini',
  });

const delivery = Joi.object({
  delivery_date: deliveryDate,
  method: Joi.string().valid('antar_nabila', 'ambil_sendiri').required().label('Cara antar'),
  address: Joi.when('method', {
    is: 'antar_nabila',
    then: Joi.string().trim().min(1).max(300).required().label('Alamat'),
    otherwise: Joi.any().strip(),
  }),
  // Ambil Sendiri: ongkir dibuang, service memakai 0.
  shipping_fee: Joi.when('method', {
    is: 'antar_nabila',
    then: Joi.number().integer().min(0).max(1000000).required().label('Ongkir'),
    otherwise: Joi.any().strip(),
  }),
});

// item_type wajib dikirim eksplisit supaya Joi.when di bawah tidak bergantung pada default.
const item = Joi.object({
  delivery_index: Joi.number().integer().min(0).default(0).label('Pengiriman item'),
  item_type: Joi.string()
    .valid(...ITEM_TYPES)
    .required()
    .label('Jenis item'),
  menu_id: Joi.when('item_type', {
    is: 'menu',
    then: Joi.number().integer().positive().max(2147483647).required().label('Menu'),
    otherwise: Joi.any().strip(),
  }),
  custom_name: Joi.when('item_type', {
    is: 'menu',
    then: Joi.any().strip(),
    otherwise: Joi.string().trim().min(1).max(100).required().label('Nama item'),
  }),
  unit_price: Joi.when('item_type', {
    is: 'menu',
    then: Joi.any().strip(), // harga item menu selalu dari database
    otherwise: Joi.number().integer().min(0).max(10000000).required().label('Harga item'),
  }),
  qty: Joi.number().integer().min(1).max(200).required().label('Jumlah'),
  option_ids: Joi.array().items(Joi.number().integer().positive().max(2147483647)).max(5).default([]).label('Opsi'), // 5 = jumlah option_group
  note: Joi.string().trim().max(500).allow('').label('Catatan'),
});

const maclabOrderCreate = Joi.object({
  customer_name: Joi.string().trim().min(1).max(100).required().label('Nama'),
  phone: phone.allow(''),
  pay_timing: Joi.string().valid('di_muka', 'setelah_kirim').required().label('Waktu bayar'),
  discount: Joi.number().integer().min(0).max(10000000).default(0).label('Diskon'),
  deliveries: Joi.array().min(1).max(10).items(delivery).required().label('Pengiriman'),
  items: Joi.array().min(1).max(50).items(item).required().label('Item pesanan'),
}).prefs({ errors: { wrap: { label: false } }, messages });

module.exports = { maclabOrderCreate };