const { prisma } = require('../../config/prisma');

/**
 * Contact Repository - Data access layer for Contact model.
 * 
 * Follows Repository Pattern:
 * - Encapsulates all database operations for Contact entity
 * - Abstracts Prisma implementation details from business logic
 * - Single Responsibility: only handles data persistence
 * 
 * Dependency Inversion Principle: Business layer depends on this abstraction, not on Prisma directly.
 */
class ContactRepository {
  /**
   * Finds contacts with pagination and optional filters.
   * @param {Object} filters - Query filters (source, attended, phoneE164)
   * @param {number} limit - Max results per page
   * @param {number} offset - Number of results to skip
   * @returns {Promise<{contacts: Array, total: number}>}
   */
  async findMany(filters = {}, limit = 50, offset = 0) {
    const where = {};

    if (filters.source !== undefined) {
      where.source = filters.source;
    }

    if (filters.attended !== undefined) {
      where.attended = filters.attended;
    }

    if (filters.phoneE164 !== undefined) {
      where.phoneE164 = filters.phoneE164;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ]);

    return { contacts, total };
  }

  /**
   * Finds a single contact by UUID.
   * @param {string} id - Contact UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        contactShows: {
          include: {
            show: true,
          },
        },
      },
    });
  }

  /**
   * Finds a contact by phone number.
   * @param {string} phoneE164 - Phone in E.164 format
   * @returns {Promise<Object|null>}
   */
  async findByPhone(phoneE164) {
    return prisma.contact.findUnique({
      where: { phoneE164 },
    });
  }

  /**
   * Creates a new contact.
   * @param {Object} data - Contact data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return prisma.contact.create({
      data: {
        name: data.name || null,
        phoneE164: data.phoneE164,
        source: data.source || null,
        attended: data.attended || false,
      },
    });
  }

  /**
   * Updates a contact by ID.
   * @param {string} id - Contact UUID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    try {
      return await prisma.contact.update({
        where: { id },
        data,
      });
    } catch (error) {
      // Prisma throws if record not found
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a contact by ID.
   * @param {string} id - Contact UUID
   * @returns {Promise<boolean>} - true if deleted, false if not found
   */
  async delete(id) {
    try {
      await prisma.contact.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }
}

module.exports = new ContactRepository();
