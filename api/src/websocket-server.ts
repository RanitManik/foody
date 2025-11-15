import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { execute, GraphQLSchema } from "graphql";
import { v4 as uuidv4 } from "uuid";
import { Server as HTTPServer } from "http";
import { prisma } from "./lib/database";
import { getUserFromToken, extractToken } from "./lib/auth";
import { GraphQLContext } from "./types/graphql";
import { logger } from "./lib/shared/logger";

/**
 * Sets up WebSocket server for GraphQL subscriptions
 * Returns cleanup function for graceful shutdown
 */
export function setupWebSocketServer(
    httpServer: HTTPServer,
    schema: GraphQLSchema,
): { wsServer: WebSocketServer; cleanup: () => Promise<void> } {
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: "/graphql",
    });

    // Setup WebSocket GraphQL handler
    const serverCleanup = useServer(
        {
            schema,
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
                    sessionId,
                } as GraphQLContext;
            },
        },
        wsServer,
    );

    const cleanup = async () => {
        await serverCleanup?.dispose?.();
        wsServer.close();
    };

    return { wsServer, cleanup };
}
