import express from "express";
import { checkDatabaseHealth } from "../../lib/database";
import { getRedisClient } from "./cache";
import { logger } from "./logger";

export const createHealthRouter = () => {
    const router = express.Router();

    // Basic health check
    router.get("/", async (req, res) => {
        // Check Redis connectivity (if available)
        const redisClient = getRedisClient();

        try {
            // Check database connectivity
            const dbHealth = await checkDatabaseHealth();
            if (dbHealth.status !== "healthy") {
                throw new Error(`Database unhealthy: ${dbHealth.error || "Unknown error"}`);
            }

            if (redisClient) {
                await redisClient.ping();
            }

            res.status(200).json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                services: {
                    database: "healthy",
                    redis: redisClient ? "healthy" : "not configured",
                },
            });
        } catch (error) {
            logger.error("Health check failed", error);
            res.status(200).json({
                status: "pending",
                timestamp: new Date().toISOString(),
                services: {
                    database: "pending",
                    redis: redisClient ? "pending" : "not configured",
                },
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    // Detailed health check
    router.get("/detailed", async (req, res) => {
        // Redis health
        const redisClient = getRedisClient();

        try {
            const startTime = Date.now();

            // Database health
            const dbStart = Date.now();
            const dbHealth = await checkDatabaseHealth();
            const dbLatency = Date.now() - dbStart;

            if (dbHealth.status !== "healthy") {
                throw new Error(`Database unhealthy: ${dbHealth.error || "Unknown error"}`);
            }

            // Redis health
            let redisLatency = null;
            let redisStatus = "not configured";

            if (redisClient) {
                const redisStart = Date.now();
                await redisClient.ping();
                redisLatency = Date.now() - redisStart;
                redisStatus = "healthy";
            }

            const totalLatency = Date.now() - startTime;

            res.status(200).json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                latency: {
                    total: `${totalLatency}ms`,
                    database: `${dbLatency}ms`,
                    redis: redisLatency ? `${redisLatency}ms` : null,
                },
                services: {
                    database: {
                        status: dbHealth.status,
                        latency: `${dbLatency}ms`,
                        connections: dbHealth.connections,
                    },
                    redis: {
                        status: redisStatus,
                        latency: redisLatency ? `${redisLatency}ms` : null,
                    },
                },
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            });
        } catch (error) {
            logger.error("Detailed health check failed", error);
            res.status(200).json({
                status: "pending",
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    // Readiness probe
    router.get("/ready", async (req, res) => {
        try {
            // Check if database is ready
            const dbHealth = await checkDatabaseHealth();
            if (dbHealth.status !== "healthy") {
                throw new Error(`Database not ready: ${dbHealth.error || "Unknown error"}`);
            }

            res.status(200).json({
                status: "ready",
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error("Readiness check failed", error);
            res.status(200).json({
                status: "pending",
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : "Database not ready",
            });
        }
    });

    return router;
};
