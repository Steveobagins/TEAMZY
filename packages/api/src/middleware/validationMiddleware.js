// Canvas: packages/api/src/middleware/validationMiddleware.js
const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log the detailed validation errors for debugging on the server
    // console.debug('Validation Errors:', errors.array());

    // Return a user-friendly error response
    return res.status(400).json({
        message: "Validation failed. Please check your input.",
        // Map errors to a simpler format { field: 'fieldName', message: 'Error message' }
        errors: errors.array().map(err => ({
            field: err.path || err.param || 'unknown', // Prefer path, fallback to param
            message: err.msg
        }))
    });
  }
  // No validation errors, proceed to the next middleware/handler
  next();
}

module.exports = { handleValidationErrors };