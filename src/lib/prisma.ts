import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient | null {
  try {
    const url = resolveDatabaseUrl();
    if (!url) return null;
    return new PrismaClient({
      datasources: { db: { url } },
    });
  } catch (error) {
    console.error("[prisma] client init failed:", error);
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function isPrismaConfigured(): boolean {
  return Boolean(prisma);
}
