const { httpError } = require('./errorHandler');

// Validasi body dengan skema Joi; field yang tidak dikenal dibuang.
module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return next(httpError(400, 'VALIDATION_ERROR', 'Data tidak valid', details));
  }
  req.body = value;
  next();
};
