import { PrismaClient } from "@prisma/client";
import { logger } from "../shared/logger";
import { API_CONSTANTS } from "../shared/constants";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with production-ready connection pooling configuration
 *
 * Connection Pooling Strategy:
 * - Development: Direct connection with basic pooling
 * - Production: Use connection pooler (PgBouncer) or Prisma Data Proxy
 *
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - DB_CONNECTION_LIMIT: Max connections per instance (default: 10)
 *
 * Constants (defined in API_CONSTANTS.DATABASE):
 * - POOL_TIMEOUT_SECONDS: Connection pool timeout in seconds (20)
 * - QUERY_TIMEOUT_MS: Query timeout in milliseconds (30000)
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
        // Connection pooling configuration
        transactionOptions: {
            maxWait: API_CONSTANTS.DATABASE.POOL_TIMEOUT_SECONDS * 1000, // Convert to ms
            timeout: API_CONSTANTS.DATABASE.QUERY_TIMEOUT_MS, // Query timeout
        },
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Connection pool monitoring
export const getConnectionInfo = async (): Promise<{
    total_connections: number;
    active_connections: number;
    idle_connections: number;
} | null> => {
    try {
        const result = await prisma.$queryRaw<
            Array<{
                total_connections: bigint;
                active_connections: bigint;
                idle_connections: bigint;
            }>
        >`SELECT
            count(*) as total_connections,
            count(*) filter (where state = 'active') as active_connections,
            count(*) filter (where state = 'idle') as idle_connections
            FROM pg_stat_activity
            WHERE datname = current_database();`;

        if (result.length > 0) {
            return {
                total_connections: Number(result[0].total_connections),
                active_connections: Number(result[0].active_connections),
                idle_connections: Number(result[0].idle_connections),
            };
        }

        return null;
    } catch (error) {
        logger.error("Failed to get connection info", { error });
        return null;
    }
};

// Health check for database connectivity
export const checkDatabaseHealth = async (): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
    connections?: {
        total_connections: number;
        active_connections: number;
        idle_connections: number;
    } | null;
    error?: string;
}> => {
    const startTime = Date.now();

    try {
        // Test basic connectivity
        await prisma.$queryRaw`SELECT 1 as health_check`;

        const latency = Date.now() - startTime;
        const connections = await getConnectionInfo();

        return {
            status: "healthy",
            latency,
            connections,
        };
    } catch (error) {
        const latency = Date.now() - startTime;

        return {
            status: "unhealthy",
            latency,
            error: error instanceof Error ? error.message : "Unknown database error",
        };
    }
};

// Database configuration validation
export const validateDatabaseConfig = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!process.env.DATABASE_URL) {
        errors.push("DATABASE_URL environment variable is required");
    } else {
        try {
            const url = new URL(process.env.DATABASE_URL);
            if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
                errors.push("DATABASE_URL must use postgresql:// or postgres:// protocol");
            }
        } catch {
            errors.push("DATABASE_URL is not a valid URL");
        }
    }

    // Validate connection pool settings
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || "10");
    if (connectionLimit < 1 || connectionLimit > 100) {
        errors.push("DB_CONNECTION_LIMIT must be between 1 and 100");
    }

    // Note: DB_POOL_TIMEOUT and DB_QUERY_TIMEOUT are now constants, not environment variables
    // They are validated at build time through the constants file

    return {
        valid: errors.length === 0,
        errors,
    };
};

// Connection pool management
export const closeDatabaseConnections = async (): Promise<void> => {
    try {
        await prisma.$disconnect();
        logger.info("Database connections closed successfully");
    } catch (error) {
        logger.error("Failed to close database connections", error);
        throw error;
    }
};

// Graceful shutdown handler
export const setupDatabaseGracefulShutdown = (): void => {
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, closing database connections...`);
        try {
            await closeDatabaseConnections();
            process.exit(0);
        } catch (error) {
            logger.error("Error during database shutdown", error);
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
};
