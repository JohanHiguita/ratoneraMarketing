const contactRepository = require('../../data/repositories/contactRepository');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors/AppError');
const { isValidUuid, isValidPhoneE164, normalizePhoneE164 } = require('../../shared/validators/validators');

/**
 * Contact Service - Business logic layer for Contact operations.
 * 
 * Follows principles:
 * - Single Responsibility: handles only contact business logic
 * - Dependency Inversion: depends on repository abstraction, not implementation
 * - Open/Closed: open for extension (new methods), closed for modification
 * 
 * No HTTP concerns (req/res) - only pure business logic.
 */
class ContactService {
  /**
   * Retrieves a paginated list of contacts with optional filters.
   * @param {Object} filters - Query filters
   * @param {number} limit - Results per page
   * @param {number} offset - Pagination offset
   * @returns {Promise<{contacts: Array, total: number}>}
   */
  async getContacts(filters, limit, offset) {
    // Business rule: limit must be between 1 and 200
    const safeLimit = Math.min(Math.max(limit || 50, 1), 200);
    const safeOffset = Math.max(offset || 0, 0);

    // Validate phone format if provided
    if (filters.phoneE164) {
      const normalized = normalizePhoneE164(filters.phoneE164);
      if (!isValidPhoneE164(normalized)) {
        throw new ValidationError('Invalid phone_e164 format');
      }
      filters.phoneE164 = normalized;
    }

    return contactRepository.findMany(filters, safeLimit, safeOffset);
  }

  /**
   * Retrieves a single contact by ID.
   * @param {string} id - Contact UUID
   * @returns {Promise<Object>}
   * @throws {ValidationError} if ID format is invalid
   * @throws {NotFoundError} if contact doesn't exist
   */
  async getContactById(id) {
    if (!isValidUuid(id)) {
      throw new ValidationError('Invalid contact ID format');
    }

    const contact = await contactRepository.findById(id);

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    return contact;
  }

  /**
   * Creates a new contact.
   * @param {Object} data - Contact data
   * @returns {Promise<Object>}
   * @throws {ValidationError} if phone format is invalid
   * @throws {ConflictError} if phone already exists
   */
  async createContact(data) {
    // Validate and normalize phone
    const phone = normalizePhoneE164(data.phoneE164 || '');
    if (!isValidPhoneE164(phone)) {
      throw new ValidationError('phone_e164 must be a valid E.164 number');
    }

    // Business rule: check for duplicate phone
    const existing = await contactRepository.findByPhone(phone);
    if (existing) {
      throw new ConflictError('Phone number already exists');
    }

    return contactRepository.create({
      ...data,
      phoneE164: phone,
    });
  }

  /**
   * Updates an existing contact.
   * @param {string} id - Contact UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   * @throws {ValidationError} if ID is invalid
   * @throws {NotFoundError} if contact doesn't exist
   */
  async updateContact(id, updates) {
    if (!isValidUuid(id)) {
      throw new ValidationError('Invalid contact ID format');
    }

    // Business rule: only allow updating certain fields
    const allowedFields = ['name', 'source', 'attended'];
    const safeUpdates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const updated = await contactRepository.update(id, safeUpdates);

    if (!updated) {
      throw new NotFoundError('Contact not found');
    }

    return updated;
  }

  /**
   * Deletes a contact.
   * @param {string} id - Contact UUID
   * @returns {Promise<void>}
   * @throws {ValidationError} if ID is invalid
   * @throws {NotFoundError} if contact doesn't exist
   */
  async deleteContact(id) {
    if (!isValidUuid(id)) {
      throw new ValidationError('Invalid contact ID format');
    }

    const deleted = await contactRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Contact not found');
    }
  }
}

module.exports = new ContactService();
