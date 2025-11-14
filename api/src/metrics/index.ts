import { register, collectDefaultMetrics, Counter, Histogram } from "prom-client";

// ===== METRICS SETUP =====
// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Custom metrics
export const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const graphqlQueryCount = new Counter({
    name: "graphql_queries_total",
    help: "Total number of GraphQL queries",
    labelNames: ["operation_type", "operation_name"],
});

// Export register for use in main server file
export { register };
