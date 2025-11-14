import { Request, Response } from "express";
import { Application } from "express";
import { logger } from "../lib/shared/logger";

export function setupLoggingMiddleware(app: Application) {
    // ===== RESPONSE LOGGING MIDDLEWARE =====
    app.use((req: Request, res: Response, next: () => void) => {
        const requestId = req.headers["x-request-id"] as string;
        const startTime = Date.now();

        // Log request start
        logger.info(`Request started`, {
            requestId,
            method: req.method,
            url: req.url,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
        });

        res.on("finish", () => {
            const duration = Date.now() - startTime;

            logger.info(`Request completed`, {
                requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                contentLength: res.get("Content-Length"),
            });
        });

        next();
    });
}
