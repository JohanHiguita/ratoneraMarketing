const contactService = require('../../business/services/contactService');
const { parseBoolean } = require('../../shared/validators/validators');
const { buildPaginationResponse } = require('../../shared/utils/helpers');

/**
 * Contact Controller - Presentation layer.
 * 
 * Responsibilities (following SRP):
 * - Parse and validate HTTP request data
 * - Call appropriate service methods
 * - Format responses as JSON
 * - Handle HTTP status codes
 * 
 * Does NOT contain business logic - delegates to service layer.
 */
class ContactController {
  /**
   * GET /api/contacts
   * Lists contacts with pagination and filters.
   */
  async list(req, res) {
    const filters = {};
    const limit = parseInt(req.query.limit, 10);
    const offset = parseInt(req.query.offset, 10);

    // Parse query filters
    if (req.query.source) {
      filters.source = String(req.query.source);
    }

    if (req.query.attended !== undefined) {
      filters.attended = parseBoolean(req.query.attended);
    }

    if (req.query.phone_e164) {
      filters.phoneE164 = String(req.query.phone_e164);
    }

    const { contacts, total } = await contactService.getContacts(filters, limit, offset);

    const response = buildPaginationResponse(contacts, total, limit || 50, offset || 0);
    res.json(response);
  }

  /**
   * GET /api/contacts/:id
   * Retrieves a single contact by ID.
   */
  async getById(req, res) {
    const { id } = req.params;
    const contact = await contactService.getContactById(id);
    res.json(contact);
  }

  /**
   * POST /api/contacts
   * Creates a new contact.
   */
  async create(req, res) {
    const data = {
      name: req.body.name || null,
      phoneE164: req.body.phone_e164,
      source: req.body.source || null,
      attended: Boolean(req.body.attended),
    };

    const contact = await contactService.createContact(data);
    res.status(201).json(contact);
  }

  /**
   * PATCH /api/contacts/:id
   * Updates an existing contact.
   */
  async update(req, res) {
    const { id } = req.params;
    const updates = req.body;

    const contact = await contactService.updateContact(id, updates);
    res.json(contact);
  }

  /**
   * DELETE /api/contacts/:id
   * Deletes a contact.
   */
  async delete(req, res) {
    const { id } = req.params;
    await contactService.deleteContact(id);
    res.status(204).end();
  }
}

module.exports = new ContactController();
