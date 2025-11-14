import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with connection pooling configuration
 * Connection pooling is configured via DATABASE_URL connection string parameters:
 * - ?connection_limit=10&pool_timeout=20
 * For production, use a connection pooler like PgBouncer or Prisma Data Proxy
 */
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "production"
                ? ["error", "warn"]
                : process.env.DEBUG_PRISMA === "true"
                  ? ["query", "info", "warn", "error"]
                  : ["error", "warn"],
        // Connection pool configuration (if using direct connection)
        // For production, configure via DATABASE_URL or use Prisma Data Proxy
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
