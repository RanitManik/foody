import rateLimit from "express-rate-limit";
import { Application } from "express";
import { API_CONSTANTS } from "../lib/shared/constants";

export function setupRateLimitMiddleware(app: Application) {
    // Rate limiting - separate policies for different routes (after body parsing)
    const generalLimiter = rateLimit({
        windowMs: API_CONSTANTS.RATE_LIMIT.WINDOW_MS,
        max: API_CONSTANTS.RATE_LIMIT.MAX_REQUESTS,
        message: "Too many requests, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Auth rate limiting (stricter)
    const authLimiter = rateLimit({
        windowMs: API_CONSTANTS.AUTH_RATE_LIMIT.WINDOW_MS,
        max: API_CONSTANTS.AUTH_RATE_LIMIT.MAX_REQUESTS,
        message: "Too many login attempts. Try again in 1 minute.",
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method !== "POST",
    });

    // Apply rate limiters
    app.use("/health", generalLimiter);
    app.use("/auth", authLimiter);
    app.use("/graphql", generalLimiter);
}
