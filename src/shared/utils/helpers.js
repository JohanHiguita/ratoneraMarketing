/**
 * Wraps async route handlers to catch errors and pass them to Express error middleware.
 * Follows Single Responsibility Principle (SRP) - only handles error forwarding.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Builds a standardized pagination response object.
 */
function buildPaginationResponse(data, total, limit, offset) {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}

module.exports = {
  asyncHandler,
  buildPaginationResponse,
};
