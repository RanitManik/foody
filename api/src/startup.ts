import { logger } from "./lib/shared/logger";
import { initRedis } from "./lib/shared/cache";
import { prisma, validateDatabaseConfig } from "./lib/database";

/**
 * Startup checks to ensure all required services are available
 * Fails fast with clear error messages
 */
export async function runStartupChecks(): Promise<void> {
    logger.info("Running startup checks...");

    // 1. Validate environment variables
    const REQUIRED_ENV_VARS = ["JWT_SECRET", "DATABASE_URL"];
    const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (missingEnvVars.length > 0) {
        const message = `Missing environment variable(s): ${missingEnvVars.join(", ")}`;
        if (process.env.NODE_ENV === "production") {
            throw new Error(`❌ ${message}`);
        } else {
            logger.warn(`⚠️  ${message} - ensure .env file is loaded or vars are set`);
        }
    }

    // 2. Validate database configuration
    const dbConfigValidation = validateDatabaseConfig();
    if (!dbConfigValidation.valid) {
        const message = `Invalid database configuration: ${dbConfigValidation.errors.join(", ")}`;
        if (process.env.NODE_ENV === "production") {
            throw new Error(`❌ ${message}`);
        } else {
            logger.warn(`⚠️  ${message}`);
        }
    }

    // 3. Initialize Redis (with timeout)
    try {
        const redisTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis initialization timeout")), 5000),
        );
        const redisInit = initRedis();

        await Promise.race([redisInit, redisTimeout]);
        logger.info("✅ Redis initialized");
    } catch (error) {
        logger.error("❌ Failed to initialize Redis", { error });
        if (process.env.NODE_ENV === "production") {
            throw error;
        }
    }

    // 4. Connect to database (with timeout)
    try {
        const dbTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database connection timeout")), 5000),
        );
        const dbConnect = prisma.$connect();

        await Promise.race([dbConnect, dbTimeout]);
        logger.info("✅ Database connected");
    } catch (error) {
        logger.error("❌ Failed to connect to database", { error });
        throw error;
    }

    logger.info("✅ All startup checks passed");
}
