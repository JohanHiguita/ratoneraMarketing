const { AppError } = require('../../shared/errors/AppError');

/**
 * Global error handler middleware for Express.
 * 
 * Handles:
 * - AppError instances (operational errors with status codes)
 * - Unexpected errors (logged and returned as 500)
 * 
 * Follows Interface Segregation: only handles errors, nothing else.
 */
function errorHandler(err, req, res, next) {
  // Log all errors
  console.error('Error:', err);

  // Operational errors (AppError instances)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Unexpected/programming errors
  res.status(500).json({
    error: 'Internal server error',
  });
}

module.exports = { errorHandler };
