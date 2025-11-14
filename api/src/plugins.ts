import { ApolloServerPlugin } from "@apollo/server";
import { logger } from "./lib/shared/logger";
import { graphqlQueryCount } from "./metrics";

// ===== ERROR LOGGING PLUGIN =====
export const ErrorLoggingPlugin: ApolloServerPlugin = {
    async requestDidStart(ctx) {
        const requestId = ctx.request.http?.headers.get("x-request-id") || "unknown";
        const operationName = ctx.request.operationName || "anonymous";
        const operationType = ctx.operation?.operation || "unknown";

        return {
            async didEncounterErrors(ctx) {
                for (const err of ctx.errors ?? []) {
                    // Log errors with appropriate detail level
                    const errorData = {
                        message: err.message,
                        path: err.path,
                        requestId,
                        operationName,
                        operationType,
                        ...(process.env.NODE_ENV === "development" && {
                            stack: err.stack,
                            extensions: err.extensions,
                        }),
                    };
                    logger.error("GraphQL Error", errorData);
                }
            },
            async executionDidStart() {
                // Log introspection attempts in production
                if (process.env.NODE_ENV === "production" && operationName?.startsWith("__")) {
                    logger.warn("Introspection query attempted in production", {
                        requestId,
                        operationName,
                        operationType,
                    });
                }

                return {
                    async executionDidEnd() {
                        // Record GraphQL query metrics centrally
                        graphqlQueryCount.labels(operationType, operationName).inc();
                    },
                };
            },
        };
    },
};
