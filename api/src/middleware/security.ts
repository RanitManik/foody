import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import express from "express";
import { Application } from "express";
import { API_CONSTANTS } from "../lib/shared/constants";
import { logger } from "../lib/shared/logger";

export function setupSecurityMiddleware(app: Application) {
    // Compression - gzip responses
    app.use(compression());

    // Body parsing - must come before rate limiting for auth routes
    app.use(express.json({ limit: API_CONSTANTS.BODY_PARSER_LIMIT }));
    app.use(express.urlencoded({ extended: true, limit: API_CONSTANTS.BODY_PARSER_LIMIT }));

    // Request timeout - 30 seconds
    app.use((req, res, next) => {
        res.setTimeout(API_CONSTANTS.REQUEST_TIMEOUT_MS, () => {
            const requestId = req.headers["x-request-id"] as string;
            logger.warn(`Request timeout: ${req.method} ${req.path}`, { requestId });
            res.status(408).json({ error: "Request timeout" });
        });
        next();
    });

    // Security - Helmet with comprehensive security headers
    app.use(
        helmet({
            contentSecurityPolicy:
                process.env.NODE_ENV === "production"
                    ? {
                          directives: {
                              defaultSrc: ["'self'"],
                              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                              styleSrc: ["'self'", "'unsafe-inline'"],
                              imgSrc: ["'self'", "data:", "https:"],
                              connectSrc: ["'self'", "https://studio.apollographql.com"],
                              fontSrc: ["'self'", "https:", "data:"],
                              objectSrc: ["'none'"],
                              mediaSrc: ["'self'"],
                              frameSrc: ["'none'"],
                          },
                      }
                    : false,
            // Additional security headers
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
            },
            // Prevent clickjacking
            frameguard: { action: "deny" },
            // Disable X-Powered-By header
            hidePoweredBy: true,
            // Prevent MIME type sniffing
            noSniff: true,
            // XSS protection
            xssFilter: true,
            // Prevent referrer leakage
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        }),
    );

    // Additional security headers
    app.use((req, res, next) => {
        // Remove server information
        res.removeHeader("X-Powered-By");

        // Additional security headers
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()");

        // Prevent caching of sensitive responses
        if (req.path.includes("/auth") || req.path.includes("/graphql")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
        }

        next();
    });

    // CORS - parse and validate origins
    const rawOrigins = process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"];
    const origins = rawOrigins.map((o) => o.trim()).filter(Boolean);

    app.use(
        cors({
            origin: origins,
            credentials: true,
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }),
    );

    return { origins };
}
