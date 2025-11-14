import winston from "winston";

/**
 * Centralized logging utility for the Foody API
 *
 * Usage across the application:
 * - Import: `import { logger, log } from "../lib/shared/logger"`
 * - Use logger: `logger.info("Message", { metadata })`
 * - Use convenience methods: `log.info("Message", { metadata })`
 *
 * Log levels: error, warn, info, debug
 * Configure via LOG_LEVEL environment variable (default: "info")
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    defaultMeta: { service: "foody-api" },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
    ],
});

// Export logger methods for convenience
export const log = {
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
};
