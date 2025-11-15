import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from "prom-client";

// ===== METRICS SETUP =====
// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// HTTP metrics
export const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
});

// GraphQL metrics
export const graphqlQueryCount = new Counter({
    name: "graphql_queries_total",
    help: "Total number of GraphQL queries",
    labelNames: ["operation_type", "operation_name"],
});

export const graphqlQueryDuration = new Histogram({
    name: "graphql_query_duration_seconds",
    help: "Duration of GraphQL operations",
    labelNames: ["operation_type", "operation_name"],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const graphqlComplexityScore = new Histogram({
    name: "graphql_complexity_score",
    help: "Complexity score of GraphQL queries",
    buckets: [10, 50, 100, 200, 500, 1000],
});

// Cache metrics
export const cacheHitsTotal = new Counter({
    name: "cache_hits_total",
    help: "Total number of cache hits",
    labelNames: ["cache_type"],
});

export const cacheMissesTotal = new Counter({
    name: "cache_misses_total",
    help: "Total number of cache misses",
    labelNames: ["cache_type"],
});

export const cacheSize = new Gauge({
    name: "cache_size",
    help: "Current size of cache",
    labelNames: ["cache_type"],
});

// Database metrics
export const databaseQueryDuration = new Histogram({
    name: "database_query_duration_seconds",
    help: "Duration of database queries",
    labelNames: ["operation", "table"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

export const databaseConnectionPoolSize = new Gauge({
    name: "database_connection_pool_size",
    help: "Current size of database connection pool",
});

// Error metrics
export const applicationErrorsTotal = new Counter({
    name: "application_errors_total",
    help: "Total number of application errors",
    labelNames: ["type", "operation"],
});

// Business metrics
export const activeUsers = new Gauge({
    name: "active_users",
    help: "Number of currently active users",
});

export const ordersCreatedTotal = new Counter({
    name: "orders_created_total",
    help: "Total number of orders created",
    labelNames: ["status"],
});

// Export register for use in main server file
export { register };
