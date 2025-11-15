import express from "express";
import { setupRequestIdMiddleware } from "./request-id";
import { setupSecurityMiddleware } from "./security";
import { setupTimeoutMiddleware } from "./timeout";
import { setupRateLimitMiddleware } from "./rate-limit";
import { setupLoggingMiddleware } from "./logging";
import { setupMetricsMiddleware } from "./metrics";
import { setupErrorHandlerMiddleware } from "./error-handler";

export function setupMiddleware(app: express.Application) {
    // Setup middleware in correct order
    setupRequestIdMiddleware(app);
    const { origins } = setupSecurityMiddleware(app);
    setupTimeoutMiddleware(app); // Add timeout early in the chain
    setupRateLimitMiddleware(app);
    setupLoggingMiddleware(app);
    setupMetricsMiddleware(app);
    setupErrorHandlerMiddleware(app);

    return { origins };
}
