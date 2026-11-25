const Joi = require('joi');
const { isValidDate, todayJakarta } = require('../utils/date');

// Skema dasbor pesanan (openapi: ConfirmRequest, RescheduleRequest, CancelRequest, query GET /admin/orders).
const messages = require('./messages');
const prefs = { errors: { wrap: { label: false } }, messages };
const rupiah = (label, max) => Joi.number().integer().min(0).max(max).label(label);
const reason = Joi.string().trim().min(1).max(300).required().label('Alasan');

const confirmOrder = Joi.object({
  pay_timing: Joi.string().valid('di_muka', 'setelah_kirim').required().label('Waktu bayar'),
  discount: rupiah('Diskon', 10000000).default(0),
  shipping_fees: Joi.array()
    .max(10)
    .items(Joi.object({
      delivery_id: Joi.number().integer().positive().required().label('Pengiriman'),
      shipping_fee: rupiah('Ongkir', 1000000).required(),
    }))
    .unique('delivery_id')
    .default([])
    .label('Ongkir'),
}).prefs(prefs);

// Nabila boleh memindah ke hari ini (pesanan mendadak), tidak ke tanggal yang sudah lewat.
const rescheduleOrder = Joi.object({
  delivery_id: Joi.number().integer().positive().required().label('Pengiriman'),
  new_date: Joi.string()
    .required()
    .label('Tanggal kirim baru')
    .custom((value, helpers) => {
      if (!isValidDate(value)) return helpers.error('date.invalid');
      if (value < todayJakarta()) return helpers.error('date.past');
      return value;
    })
    .messages({ 'date.invalid': 'Tanggal kirim baru tidak valid', 'date.past': 'Tanggal kirim baru tidak boleh sebelum hari ini' }),
  reason,
}).prefs(prefs);

const cancelOrder = Joi.object({ reason }).prefs(prefs);

const listQuery = Joi.object({
  status: Joi.string().valid('menunggu_konfirmasi', 'menunggu_pembayaran', 'diproses', 'selesai', 'dibatalkan').label('Status'),
  date: Joi.string().custom((v, h) => (isValidDate(v) ? v : h.error('date.invalid'))).label('Tanggal')
    .messages({ 'date.invalid': 'Tanggal tidak valid (format YYYY-MM-DD)' }),
  q: Joi.string().trim().max(100).allow('').label('Pencarian'),
}).prefs(prefs);

module.exports = { confirmOrder, rescheduleOrder, cancelOrder, listQuery };
