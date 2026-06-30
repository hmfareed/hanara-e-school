/**
 * validate(schema)
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 400 with structured field errors on failure.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }
  // Replace req.body with the parsed (and coerced) data
  req.body = result.data;
  next();
};

/**
 * validateQuery(schema)
 * Same as validate but for req.query
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return res.status(400).json({
      success: false,
      message: 'Query validation failed',
      errors,
    });
  }
  req.query = result.data;
  next();
};

module.exports = { validate, validateQuery };
