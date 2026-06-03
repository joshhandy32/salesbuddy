import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev, so we don't open a new
// database connection on every change (a common Next.js + Prisma gotcha).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
