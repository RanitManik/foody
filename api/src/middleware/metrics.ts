import { Request, Response } from "express";
import { Application } from "express";
import { httpRequestDuration } from "../metrics";

export function setupMetricsMiddleware(app: Application) {
    // ===== HTTP METRICS MIDDLEWARE =====
    app.use((req: Request, res: Response, next: () => void) => {
        const startTime = Date.now();

        res.on("finish", () => {
            const duration = Date.now() - startTime;
            const durationInSeconds = duration / 1000;

            // Determine route label - avoid accessing req.body for GraphQL to prevent logging large payloads
            let routeLabel = req.path;
            if (req.path === "/graphql") {
                // Guard against accessing req.body which could contain large GraphQL queries
                const op =
                    typeof req.body?.operationName === "string"
                        ? req.body.operationName
                        : "unknown";
                routeLabel = `graphql:${op}`;
            }

            // Record HTTP metrics (GraphQL metrics are handled in the plugin)
            httpRequestDuration
                .labels(req.method, routeLabel, res.statusCode.toString())
                .observe(durationInSeconds);
        });

        next();
    });
}
