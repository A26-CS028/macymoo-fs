const Joi = require('joi');
const { isValidDate } = require('../utils/date');

const kitchenQuery = Joi.object({
  date: Joi.string()
    .required()
    .custom((value, helpers) => (isValidDate(value) ? value : helpers.error('date.invalid')))
    .label('Tanggal')
    .messages({
      'any.required': 'Tanggal wajib diisi',
      'string.empty': 'Tanggal wajib diisi',
      'date.invalid': 'Tanggal tidak valid (format YYYY-MM-DD)',
    }),
});

module.exports = { kitchenQuery };
