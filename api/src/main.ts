// ===== EXTERNAL DEPENDENCIES =====
import express from "express";
import { expressMiddleware } from "@as-integrations/express4";
import { createServer } from "http";
import type { Request, Response } from "express";

// ===== INTERNAL MODULES =====
import { logger } from "./lib/shared/logger";
import { prisma, setupDatabaseGracefulShutdown } from "./lib/database";
import { getUserFromToken, extractToken } from "./lib/auth";
import { GraphQLContext } from "./types/graphql";
import { setupMiddleware } from "./middleware";
import { API_CONSTANTS } from "./lib/shared/constants";
import { createHealthRouter } from "./lib/shared/health";
import { createMetricsRouter } from "./lib/shared/metrics";
import { runStartupChecks } from "./startup";
import { createApolloServer } from "./graphql-server";
import { setupWebSocketServer } from "./websocket-server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs, resolvers } from "./graphql";

// ===== SERVER CONFIGURATION =====
const host = process.env.HOST ?? API_CONSTANTS.SERVER.DEFAULT_HOST;
const port = process.env.PORT ? Number(process.env.PORT) : API_CONSTANTS.SERVER.DEFAULT_PORT;

async function main() {
    // Run all startup checks (env, DB, Redis)
    await runStartupChecks();

    const app = express();

    // Setup middleware
    const { origins } = setupMiddleware(app);

    // ===== GRAPHQL SETUP =====
    const executableSchema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });

    // HTTP server (needed for WebSocket)
    const httpServer = createServer(app);

    // Setup WebSocket server for subscriptions
    const { cleanup: wsCleanup } = setupWebSocketServer(httpServer, executableSchema);

    // Create and start Apollo Server
    const server = createApolloServer();
    await server.start();

    // GraphQL HTTP endpoint
    app.use(
        "/graphql",
        expressMiddleware(server, {
            context: async ({
                req,
                res,
            }: {
                req: Request;
                res: Response;
            }): Promise<GraphQLContext> => {
                const authHeader = req.headers.authorization as string | undefined;
                const token = extractToken({ authHeader });
                const user = await getUserFromToken(token);

                return {
                    req,
                    res,
                    prisma,
                    user,
                    requestId: req.headers["x-request-id"] as string,
                };
            },
        }),
    );

    // Health and monitoring routes
    app.use("/health", createHealthRouter());
    app.use("/metrics", createMetricsRouter());

    // Note: Global error handler is set up in setupMiddleware (error-handler.ts)
    // This ensures consistent error handling across the application

    // ===== SERVER STARTUP =====
    httpServer.listen(port, host, () => {
        logger.info(`🚀 GraphQL Server ready at http://${host}:${port}/graphql`);
        logger.info(`📊 Health check at http://${host}:${port}/health`);
        logger.info(`📈 Metrics endpoint at http://${host}:${port}/metrics`);
        logger.info(`✅ Readiness check at http://${host}:${port}/health/ready`);
        logger.info(`🔒 Query depth limit: 10 | Complexity limit: 2000`);
        logger.info(`🌐 CORS origins: ${origins.join(", ")}`);
    });

    // Setup database graceful shutdown handlers
    setupDatabaseGracefulShutdown();

    // ===== GRACEFUL SHUTDOWN =====
    const gracefulShutdown = async () => {
        logger.info("Shutting down gracefully...");

        const cleanupTimer = setTimeout(() => {
            logger.warn("Graceful shutdown timed out, force exit");
            process.exit(1);
        }, API_CONSTANTS.SERVER.SHUTDOWN_TIMEOUT_MS);

        try {
            // Cleanup WebSocket server
            await wsCleanup();

            // Stop Apollo Server
            await server.stop();

            // Close HTTP server
            await new Promise<void>((resolve, reject) => {
                httpServer.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            // Note: Database disconnection is handled by setupDatabaseGracefulShutdown
            clearTimeout(cleanupTimer);
            logger.info("✅ Shutdown complete.");
            process.exit(0);
        } catch (err) {
            logger.error("❌ Error during shutdown:", err);
            process.exit(1);
        }
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    // Handle unhandled errors
    process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled Rejection", { reason });
        gracefulShutdown().catch(() => process.exit(1));
    });

    process.on("uncaughtException", (err) => {
        logger.error("Uncaught Exception", { err });
        gracefulShutdown().catch(() => process.exit(1));
    });
}

main().catch((error) => {
    logger.error("❌ Server startup error:", error);
    process.exit(1);
});
