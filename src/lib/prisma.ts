/**
 * Prisma Client Singleton with Accelerate
 *
 * Ensures we don't create multiple Prisma Client instances during development
 * (hot reloading would create new instances without closing old ones)
 *
 * Uses Prisma Accelerate for improved performance and connection pooling
 */

import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// Import types and enums from standard client for re-export
import type {
  Invoice,
  InvoiceItem,
  Organization,
  User,
  AuditLog,
  Prisma,
} from '@prisma/client';

// Import enums as values (not types)
import {
  InvoiceStatus,
  HKAEnvironment,
  UserRole,
} from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export Prisma types for convenience
export type {
  Invoice,
  InvoiceItem,
  Organization,
  User,
  AuditLog,
  Prisma,
};

// Re-export enums as values
export {
  InvoiceStatus,
  HKAEnvironment,
  UserRole,
};
