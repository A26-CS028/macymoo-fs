const Joi = require('joi');

const paymentCreate = Joi.object({
  type: Joi.string().valid('dp', 'pelunasan', 'refund').required().messages({ 'any.only': 'type tidak dikenal' }),
  method: Joi.string().valid('qris', 'transfer', 'tunai').required().messages({ 'any.only': 'method tidak dikenal' }),
  amount: Joi.number().integer().min(1).max(2147483647).required().messages({
    'number.base': 'amount harus angka',
    'number.integer': 'amount harus Rupiah bulat',
    'number.min': 'amount minimal Rp1',
    'number.max': 'amount terlalu besar',
  }),
});

module.exports = { paymentCreate };