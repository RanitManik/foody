// API Constants
export const API_CONSTANTS = {
    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: 900000, // 15 minutes
        MAX_REQUESTS: 100,
    },

    // Auth Rate Limiting
    AUTH_RATE_LIMIT: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 5,
    },

    // Request Timeout
    REQUEST_TIMEOUT_MS: 30000,

    // Body Parser Limits
    BODY_PARSER_LIMIT: "1mb",

    // GraphQL Limits
    GRAPHQL: {
        MAX_DEPTH: 10,
        MAX_COMPLEXITY: 2000,
    },
} as const;
