import { GraphQLError } from "graphql";

/**
 * Standard GraphQL error codes
 */
export enum ErrorCode {
    UNAUTHENTICATED = "UNAUTHENTICATED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    BAD_USER_INPUT = "BAD_USER_INPUT",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

/**
 * Create a standardized GraphQL error with error code
 */
export function createGraphQLError(
    message: string,
    code: ErrorCode,
    originalError?: Error,
): GraphQLError {
    return new GraphQLError(message, {
        extensions: {
            code,
            ...(originalError &&
                process.env.NODE_ENV !== "production" && {
                    originalError: originalError.message,
                }),
        },
    });
}

/**
 * Helper functions for common error types
 */
export const GraphQLErrors = {
    unauthenticated: (message = "Not authenticated") =>
        createGraphQLError(message, ErrorCode.UNAUTHENTICATED),
    forbidden: (message = "Access denied") => createGraphQLError(message, ErrorCode.FORBIDDEN),
    notFound: (message = "Resource not found") => createGraphQLError(message, ErrorCode.NOT_FOUND),
    badInput: (message: string) => createGraphQLError(message, ErrorCode.BAD_USER_INPUT),
    internal: (message = "Internal server error", originalError?: Error) =>
        createGraphQLError(message, ErrorCode.INTERNAL_SERVER_ERROR, originalError),
};
