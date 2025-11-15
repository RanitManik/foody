import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Application, Request } from "express";
import { API_CONSTANTS } from "../lib/shared/constants";
import { getRedisClient } from "../lib/shared/cache";

export function setupRateLimitMiddleware(app: Application) {
    // Get Redis client for rate limiting store
    const redisClient = getRedisClient();

    // Create rate limit store configuration
    const createLimiter = (options: Parameters<typeof rateLimit>[0]) => {
        const limiterOptions = {
            ...options,
            standardHeaders: true,
            legacyHeaders: false,
            // Use Redis store if available, otherwise fall back to memory (dev only)
            ...(redisClient && {
                store: new RedisStore({
                    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
                }),
            }),
            // Skip rate limiting for health checks in development
            skip: (req: Request) =>
                process.env.NODE_ENV === "development" && req.path === "/health",
        };

        return rateLimit(limiterOptions);
    };

    // General API rate limiting (more permissive)
    const generalLimiter = createLimiter({
        windowMs: API_CONSTANTS.RATE_LIMIT.WINDOW_MS, // 15 minutes
        max: API_CONSTANTS.RATE_LIMIT.MAX_REQUESTS, // 100 requests per window
        message: {
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: Math.ceil(API_CONSTANTS.RATE_LIMIT.WINDOW_MS / 1000),
        },
    });

    // Auth rate limiting (stricter - brute force protection)
    const authLimiter = createLimiter({
        windowMs: API_CONSTANTS.AUTH_RATE_LIMIT.WINDOW_MS, // 1 minute
        max: API_CONSTANTS.AUTH_RATE_LIMIT.MAX_REQUESTS, // 5 attempts per minute
        message: {
            error: "Too many authentication attempts",
            message: "Too many login attempts. Account temporarily locked. Try again in 1 minute.",
            retryAfter: 60,
        },
        skip: (req: Request) => req.method !== "POST", // Only rate limit POST requests
    });

    // GraphQL rate limiting (medium strictness)
    const graphqlLimiter = createLimiter({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 200, // 200 GraphQL operations per 5 minutes
        message: {
            error: "GraphQL rate limit exceeded",
            message: "Too many GraphQL requests. Please slow down.",
            retryAfter: 300,
        },
    });

    // Intensive operations rate limiting (very strict)
    const intensiveLimiter = createLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 intensive operations per minute
        message: {
            error: "Too many intensive operations",
            message: "Too many resource-intensive operations. Please try again later.",
            retryAfter: 60,
        },
    });

    // Apply rate limiters with specific routes
    app.use("/health", generalLimiter);
    app.use("/auth", authLimiter);
    app.use("/graphql", graphqlLimiter);

    // Intensive operations (searches, complex queries)
    app.use((req, res, next) => {
        if (
            req.path.includes("/search") ||
            req.path.includes("/complex") ||
            (req.body && JSON.stringify(req.body).length > 10000)
        ) {
            return intensiveLimiter(req, res, next);
        }
        next();
    });
}
