const Joi = require('joi');

const messages = {
  'any.required': '{#label} wajib diisi',
  'any.only': '{#label} tidak valid',
  'string.base': '{#label} harus berupa teks',
  'string.empty': '{#label} wajib diisi',
  'string.min': '{#label} minimal {#limit} karakter',
  'string.max': '{#label} maksimal {#limit} karakter',
  'string.uri': '{#label} harus berupa tautan yang valid',
  'string.uriCustomScheme': '{#label} harus berupa tautan https',
  'number.base': '{#label} harus berupa angka',
  'number.integer': '{#label} harus Rupiah bulat, tanpa desimal',
  'number.min': '{#label} minimal {#limit}',
  'number.max': '{#label} maksimal {#limit}',
  'boolean.base': '{#label} harus true atau false',
  'object.min': 'Minimal satu field harus diisi',
};

// Sama dengan OptionGroup di openapi.yaml (DB tanpa CHECK, jadi daftar dijaga di sini).
const OPTION_GROUPS = ['pedas', 'keju', 'ayam', 'tanpa_makaroni', 'tanpa_brokoli'];

const name = () => Joi.string().trim().min(1).max(60).label('Nama');
const description = () => Joi.string().trim().max(300).allow('').label('Deskripsi');
const price = () => Joi.number().integer().min(0).max(10000000).label('Harga');
const extraPrice = () => Joi.number().integer().min(0).max(10000000).label('Harga tambahan');
const photoUrl = () => Joi.string().trim().uri({ scheme: ['https'] }).max(500).label('URL foto');
const isAvailable = () => Joi.boolean().label('Status tersedia');

const prefs = { errors: { wrap: { label: false } }, messages };

const menuCreate = Joi.object({
  name: name().required(),
  description: description(),
  price: price().required(),
  photo_url: photoUrl(),
  is_available: isAvailable().default(true),
}).prefs(prefs);

const menuUpdate = Joi.object({
  name: name(),
  description: description(),
  price: price(),
  photo_url: photoUrl(),
  is_available: isAvailable(),
})
  .min(1)
  .prefs(prefs);

const optionCreate = Joi.object({
  option_group: Joi.string().valid(...OPTION_GROUPS).required().label('Kelompok opsi'),
  name: name().required(),
  extra_price: extraPrice().required(),
}).prefs(prefs);

// Kelompok opsi tidak bisa diubah lewat PATCH (sesuai openapi.yaml).
const optionUpdate = Joi.object({
  name: name(),
  extra_price: extraPrice(),
})
  .min(1)
  .prefs(prefs);

const uploadPurpose = Joi.object({
  purpose: Joi.string().valid('menu_photo', 'qris').required().label('Tujuan unggah'),
}).prefs(prefs);

module.exports = { OPTION_GROUPS, menuCreate, menuUpdate, optionCreate, optionUpdate, uploadPurpose };