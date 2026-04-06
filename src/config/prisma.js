const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client singleton instance.
 * Follows Singleton pattern to avoid multiple connections.
 * 
 * In development, attaches to global to prevent hot-reload issues.
 */
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = { prisma };
