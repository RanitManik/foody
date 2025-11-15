import { Request, Response, NextFunction, Application } from "express";
import { logger } from "../lib/shared/logger";
import { API_CONSTANTS } from "../lib/shared/constants";

/**
 * Request timeout middleware
 * Prevents hanging requests by enforcing a timeout on all Express routes
 * This is critical for production stability
 */
export function setupTimeoutMiddleware(app: Application): void {
    app.use((req: Request, res: Response, next: NextFunction) => {
        // Set socket timeout
        req.socket.setTimeout(API_CONSTANTS.HTTP_TIMEOUT_MS);

        // Set response timeout
        res.setTimeout(API_CONSTANTS.HTTP_TIMEOUT_MS, () => {
            logger.warn("Request timeout", {
                method: req.method,
                url: req.url,
                requestId: req.headers["x-request-id"],
            });

            if (!res.headersSent) {
                res.status(408).json({
                    error: "Request Timeout",
                    message: "The request took too long to complete",
                });
            }
        });

        next();
    });
}
