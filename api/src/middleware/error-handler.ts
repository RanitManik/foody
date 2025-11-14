import { Request, Response, NextFunction } from "express";
import { Application } from "express";
import { logger } from "../lib/shared/logger";

export function setupErrorHandlerMiddleware(app: Application) {
    // ===== CENTRAL ERROR HANDLER =====
    // This must be the last middleware - catches any unhandled errors
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        const requestId = req.headers["x-request-id"] as string | undefined;

        logger.error("Unhandled Express Error", {
            error: err.message,
            stack: err.stack,
            requestId,
            method: req.method,
            url: req.url,
        });

        // If headers already sent, delegate to Express default error handler
        if (res.headersSent) {
            return next(err);
        }

        // Return consistent error response
        res.status(500).json({
            error: "Internal Server Error",
            requestId,
            ...(process.env.NODE_ENV !== "production" && {
                message: err.message,
            }),
        });
    });
}
