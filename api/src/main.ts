import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { execute } from "graphql";
import { NoSchemaIntrospectionCustomRule, validateSchema } from "graphql";
import depthLimit from "graphql-depth-limit";
import { logger } from "./lib/shared/logger";
import { createComplexityRule } from "./lib/graphql/complexity";
import { typeDefs } from "./graphql";
import { resolvers } from "./graphql";
import { prisma } from "./lib/database";
import { getUserFromToken, extractToken } from "./lib/auth";
import { GraphQLContext } from "./types/graphql";
import { setupMiddleware } from "./middleware";
import { ErrorLoggingPlugin } from "./plugins";
import { register } from "./metrics";
import { API_CONSTANTS } from "./lib/shared/constants";
import { v4 as uuidv4 } from "uuid";

// ===== ENVIRONMENT VALIDATION =====
const REQUIRED_ENV_VARS = ["JWT_SECRET", "DATABASE_URL"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
    const message = `Missing environment variable(s): ${missingEnvVars.join(", ")}`;
    if (process.env.NODE_ENV === "production") {
        throw new Error(`❌ ${message}`);
    } else {
        console.warn(`⚠️  ${message} - ensure .env file is loaded or vars are set`);
    }
}

const host = process.env.HOST ?? "localhost";
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

async function main() {
    const app = express();

    // Setup middleware
    const { origins } = setupMiddleware(app);

    // ===== GRAPHQL SETUP =====
    const executableSchema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });

    // Validate schema at boot to catch type errors early
    const schemaErrors = validateSchema(executableSchema);
    if (schemaErrors.length) {
        throw new Error(
            `Schema validation failed: ${schemaErrors.map((e) => e.message).join(", ")}`,
        );
    }

    // HTTP server (needed for WebSocket)
    const httpServer = createServer(app);

    // WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });

    // Setup WebSocket GraphQL handler
    const serverCleanup = useServer(
        {
            schema: executableSchema,
            execute,
            context: async (ctx: { connectionParams?: Record<string, unknown> }) => {
                const token = extractToken({ connectionParams: ctx.connectionParams });
                const user = await getUserFromToken(token);

                // Use sessionId from connectionParams for traceability, or generate one
                const sessionId = (ctx.connectionParams?.sessionId as string) || `ws-${uuidv4()}`;

                // Log failed auth for WebSocket connections
                if (!user && token) {
                    logger.warn("WebSocket connection with invalid token", { sessionId });
                }

                return {
                    user,
                    prisma,
                    sessionId, // Use sessionId for WebSocket connections
                } as GraphQLContext;
            },
        },
        wsServer,
    );

    // Apollo Server with plugins
    const validationRules = [
        depthLimit(API_CONSTANTS.GRAPHQL.MAX_DEPTH, { ignore: ["__typename"] }),
        createComplexityRule(API_CONSTANTS.GRAPHQL.MAX_COMPLEXITY),
    ];

    if (process.env.NODE_ENV === "production") {
        validationRules.push(NoSchemaIntrospectionCustomRule);
    }

    const server = new ApolloServer<GraphQLContext>({
        schema: executableSchema,
        introspection: process.env.NODE_ENV !== "production",
        validationRules,
        plugins: [ErrorLoggingPlugin],
    });

    await server.start();

    // GraphQL HTTP endpoint
    app.use(
        "/graphql",
        expressMiddleware(server, {
            context: async ({ req, res }) => {
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

    // Health check endpoint
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Readiness check endpoint
    app.get("/health/ready", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.json({
                status: "ready",
                timestamp: new Date().toISOString(),
                database: "connected",
            });
        } catch (error) {
            res.status(503).json({
                status: "not_ready",
                timestamp: new Date().toISOString(),
                database: "disconnected",
                error:
                    process.env.NODE_ENV !== "production" ? String(error) : "Database unavailable",
            });
        }
    });

    // Metrics endpoint
    app.get("/metrics", async (_req, res) => {
        try {
            res.set("Content-Type", register.contentType);
            res.end(await register.metrics());
        } catch (ex) {
            logger.error("Error generating metrics", { error: ex });
            res.status(500).end();
        }
    });

    // Note: Global error handler is set up in setupMiddleware (error-handler.ts)
    // This ensures consistent error handling across the application

    // ===== SERVER STARTUP =====
    // Connect to database before accepting traffic
    await prisma.$connect();

    httpServer.listen(port, host, () => {
        logger.info(`🚀 GraphQL Server ready at http://${host}:${port}/graphql`);
        logger.info(`📊 Health check at http://${host}:${port}/health`);
        logger.info(`✅ Readiness check at http://${host}:${port}/health/ready`);
        logger.info(`🔒 Query depth limit: 10 | Complexity limit: 2000`);
        logger.info(`🌐 CORS origins: ${origins.join(", ")}`);
    });

    // ===== GRACEFUL SHUTDOWN =====
    const gracefulShutdown = async () => {
        logger.info("Shutting down gracefully...");

        const cleanupTimer = setTimeout(() => {
            logger.warn("Graceful shutdown timed out, force exit");
            process.exit(1);
        }, 15000);

        try {
            await serverCleanup?.dispose?.();
            wsServer.close();
            await server.stop();

            await new Promise<void>((resolve, reject) => {
                httpServer.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            await prisma.$disconnect();
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
