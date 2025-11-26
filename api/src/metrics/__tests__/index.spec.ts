// Mock prom-client
jest.mock("prom-client", () => ({
    register: {},
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn(),
    Histogram: jest.fn(),
    Gauge: jest.fn(),
}));

import { Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

const mockCounter = Counter as jest.Mock;
const mockHistogram = Histogram as jest.Mock;
const mockGauge = Gauge as jest.Mock;
const mockCollectDefaultMetrics = collectDefaultMetrics as jest.MockedFunction<
    typeof collectDefaultMetrics
>;

describe("Metrics", () => {
    let metricsModule: { register: unknown };

    beforeAll(() => {
        // Import the module to trigger initialization
        metricsModule = require("../index");
    });

    it("should collect default metrics", () => {
        expect(mockCollectDefaultMetrics).toHaveBeenCalled();
    });

    it("should create httpRequestDuration histogram", () => {
        expect(mockHistogram).toHaveBeenCalledWith({
            name: "http_request_duration_seconds",
            help: "Duration of HTTP requests in seconds",
            labelNames: ["method", "route", "status_code"],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
        });
    });

    it("should create httpRequestsTotal counter", () => {
        expect(mockCounter).toHaveBeenCalledWith({
            name: "http_requests_total",
            help: "Total number of HTTP requests",
            labelNames: ["method", "route", "status_code"],
        });
    });

    it("should create graphqlQueryCount counter", () => {
        expect(mockCounter).toHaveBeenCalledWith({
            name: "graphql_queries_total",
            help: "Total number of GraphQL queries",
            labelNames: ["operation_type", "operation_name"],
        });
    });

    it("should create graphqlQueryDuration histogram", () => {
        expect(mockHistogram).toHaveBeenCalledWith({
            name: "graphql_query_duration_seconds",
            help: "Duration of GraphQL operations",
            labelNames: ["operation_type", "operation_name"],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
        });
    });

    it("should create graphqlComplexityScore histogram", () => {
        expect(mockHistogram).toHaveBeenCalledWith({
            name: "graphql_complexity_score",
            help: "Complexity score of GraphQL queries",
            buckets: [10, 50, 100, 200, 500, 1000],
        });
    });

    it("should create cache metrics", () => {
        expect(mockCounter).toHaveBeenCalledWith({
            name: "cache_hits_total",
            help: "Total number of cache hits",
            labelNames: ["cache_type"],
        });
        expect(mockCounter).toHaveBeenCalledWith({
            name: "cache_misses_total",
            help: "Total number of cache misses",
            labelNames: ["cache_type"],
        });
        expect(mockGauge).toHaveBeenCalledWith({
            name: "cache_size",
            help: "Current size of cache",
            labelNames: ["cache_type"],
        });
    });

    it("should create database metrics", () => {
        expect(mockHistogram).toHaveBeenCalledWith({
            name: "database_query_duration_seconds",
            help: "Duration of database queries",
            labelNames: ["operation", "table"],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
        });
        expect(mockGauge).toHaveBeenCalledWith({
            name: "database_connection_pool_size",
            help: "Current size of database connection pool",
        });
    });

    it("should create error metrics", () => {
        expect(mockCounter).toHaveBeenCalledWith({
            name: "application_errors_total",
            help: "Total number of application errors",
            labelNames: ["type", "operation"],
        });
    });

    it("should create business metrics", () => {
        expect(mockGauge).toHaveBeenCalledWith({
            name: "active_users",
            help: "Number of currently active users",
        });
        expect(mockCounter).toHaveBeenCalledWith({
            name: "orders_created_total",
            help: "Total number of orders created",
            labelNames: ["status"],
        });
    });

    it("should export register", () => {
        expect(metricsModule.register).toBeDefined();
    });
});
