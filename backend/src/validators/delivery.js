const Joi = require('joi');

const deliveryUpdate = Joi.object({
  delivery_status: Joi.string().valid('terkirim').required().messages({
    'any.only': 'delivery_status harus terkirim',
    'any.required': 'delivery_status wajib diisi',
  }),
});

module.exports = { deliveryUpdate };