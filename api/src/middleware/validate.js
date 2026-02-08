// polysportsclaw-api/src/middleware/validate.js
const Joi = require('joi');
const { BadRequestError } = require('../utils/errors');

/**
 * Validation middleware factory.
 * @param {Joi.Schema} schema - Joi schema for validation.
 * @param {string} [property='body'] - The request property to validate ('body', 'query', or 'params').
 * @returns {function} Express middleware function.
 */
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false, // Return all errors, not just the first one
    allowUnknown: true, // Allow unknown keys that are ignored
    stripUnknown: true, // Remove unknown keys
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return next(new BadRequestError(errorMessages.join(', ')));
  }

  // Assign the validated value back to the request object
  req[property] = value;
  next();
};

module.exports = validate;
