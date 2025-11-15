import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { NoSchemaIntrospectionCustomRule, validateSchema } from "graphql";
import depthLimit from "graphql-depth-limit";
import { createComplexityRule } from "./lib/graphql/complexity";
import { typeDefs } from "./graphql";
import { resolvers } from "./graphql";
import { ErrorLoggingPlugin } from "./plugins";
import { API_CONSTANTS } from "./lib/shared/constants";
import { GraphQLContext } from "./types/graphql";
import { logger } from "./lib/shared/logger";

/**
 * Creates and configures the Apollo GraphQL server
 * Includes schema validation, depth/complexity limits, and production hardening
 */
export function createApolloServer(): ApolloServer<GraphQLContext> {
    // Build executable schema
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

    logger.info("✅ GraphQL schema validated successfully");

    // Setup validation rules
    const validationRules = [
        depthLimit(API_CONSTANTS.GRAPHQL.MAX_DEPTH, { ignore: ["__typename"] }),
        createComplexityRule(API_CONSTANTS.GRAPHQL.MAX_COMPLEXITY),
    ];

    if (process.env.NODE_ENV === "production") {
        validationRules.push(NoSchemaIntrospectionCustomRule);
    }

    // Create Apollo Server
    const server = new ApolloServer<GraphQLContext>({
        schema: executableSchema,
        introspection: process.env.NODE_ENV !== "production",
        validationRules,
        plugins: [ErrorLoggingPlugin],
    });

    return server;
}

export { makeExecutableSchema };
