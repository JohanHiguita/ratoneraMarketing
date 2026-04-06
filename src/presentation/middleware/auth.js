const { UnauthorizedError } = require('../../shared/errors/AppError');

/**
 * Extracts Bearer token from Authorization header.
 * @param {Request} req - Express request
 * @returns {string|null}
 */
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  return match ? match[1] : null;
}

/**
 * Bearer token authentication middleware.
 * 
 * Follows:
 * - Single Responsibility: only handles authentication
 * - Dependency Inversion: throws AppError, not HTTP responses directly
 */
function requireApiKey(req, res, next) {
  const expectedToken = process.env.API_KEY;

  if (!expectedToken) {
    return res.status(503).json({
      error: 'Server misconfigured',
      detail: 'API_KEY is required in the environment',
    });
  }

  const providedToken = getBearerToken(req);

  if (!providedToken || providedToken !== expectedToken) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"');
    throw new UnauthorizedError('Invalid or missing API key');
  }

  next();
}

module.exports = { requireApiKey };
