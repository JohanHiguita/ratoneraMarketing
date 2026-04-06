/**
 * Validates if a string is a valid UUID v4.
 */
function isValidUuid(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}

/**
 * Validates if a phone number follows E.164 format.
 * E.164: starts with +, followed by 7-15 digits.
 */
function isValidPhoneE164(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\s+/g, '');
  return /^\+\d{7,15}$/.test(normalized);
}

/**
 * Normalizes a phone number to E.164 format by removing whitespace.
 */
function normalizePhoneE164(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/\s+/g, '');
}

/**
 * Parses boolean values from query parameters.
 * Accepts: 'true', '1', 'false', '0'
 */
function parseBoolean(value) {
  if (value === 'true' || value === '1' || value === true) return true;
  if (value === 'false' || value === '0' || value === false) return false;
  return null;
}

module.exports = {
  isValidUuid,
  isValidPhoneE164,
  normalizePhoneE164,
  parseBoolean,
};
