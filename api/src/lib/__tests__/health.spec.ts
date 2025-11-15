import { Router } from "express";
import { createHealthRouter } from "../shared/health";

// Mock express
jest.mock("express", () => ({
    Router: jest.fn(),
}));

// Mock database health check
jest.mock("../../lib/database", () => ({
    checkDatabaseHealth: jest.fn(),
}));

// Mock cache
jest.mock("../shared/cache", () => ({
    getRedisClient: jest.fn(),
}));

// Mock logger
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { checkDatabaseHealth } from "../../lib/database";
import { getRedisClient } from "../shared/cache";
import { logger } from "../shared/logger";

const mockRouter = Router as jest.MockedFunction<typeof Router>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<
    typeof checkDatabaseHealth
>;
const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Health Router", () => {
    let mockExpressRouter: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let req: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let res: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();

        mockExpressRouter = {
            get: jest.fn(),
        };
        mockRouter.mockReturnValue(mockExpressRouter);

        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    describe("createHealthRouter", () => {
        it("should create a router with health endpoints", () => {
            const router = createHealthRouter();

            expect(mockRouter).toHaveBeenCalled();
            expect(mockExpressRouter.get).toHaveBeenCalledTimes(3);
            expect(router).toBe(mockExpressRouter);
        });

        describe("GET /", () => {
            let routeHandler: any; // eslint-disable-line @typescript-eslint/no-explicit-any

            beforeEach(() => {
                createHealthRouter();
                routeHandler = mockExpressRouter.get.mock.calls.find(
                    (call: [string, unknown]) => call[0] === "/",
                )[1];
            });

            it("should return healthy status when all services are healthy", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "healthy",
                    latency: 10,
                    connections: {
                        total_connections: 5,
                        active_connections: 2,
                        idle_connections: 3,
                    },
                });
                (mockGetRedisClient as any).mockReturnValue({
                    // eslint-disable-line @typescript-eslint/no-explicit-any
                    ping: jest.fn().mockResolvedValue("PONG"),
                });

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({
                    status: "healthy",
                    timestamp: expect.any(String),
                    services: {
                        database: "healthy",
                        redis: "healthy",
                    },
                });
            });

            it("should return unhealthy status when database is unhealthy", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "unhealthy",
                    latency: 10,
                    error: "Connection failed",
                });
                (mockGetRedisClient as any).mockReturnValue(null); // eslint-disable-line @typescript-eslint/no-explicit-any

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(503);
                expect(res.json).toHaveBeenCalledWith({
                    status: "unhealthy",
                    timestamp: expect.any(String),
                    error: "Database unhealthy: Connection failed",
                });
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Health check failed",
                    expect.any(Error),
                );
            });

            it("should handle Redis ping failure", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "healthy",
                    latency: 10,
                    connections: {
                        total_connections: 5,
                        active_connections: 2,
                        idle_connections: 3,
                    },
                });
                const mockRedisClient = {
                    ping: jest.fn().mockRejectedValue(new Error("Redis ping failed")),
                };
                (mockGetRedisClient as any).mockReturnValue(mockRedisClient); // eslint-disable-line @typescript-eslint/no-explicit-any

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(503);
                expect(res.json).toHaveBeenCalledWith({
                    status: "unhealthy",
                    timestamp: expect.any(String),
                    error: expect.stringContaining("Redis ping failed"),
                });
            });

            it("should handle exceptions gracefully", async () => {
                mockCheckDatabaseHealth.mockRejectedValue(new Error("Unexpected error"));

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(503);
                expect(res.json).toHaveBeenCalledWith({
                    status: "unhealthy",
                    timestamp: expect.any(String),
                    error: "Unexpected error",
                });
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Health check failed",
                    expect.any(Error),
                );
            });
        });

        describe("GET /detailed", () => {
            let routeHandler: any; // eslint-disable-line @typescript-eslint/no-explicit-any

            beforeEach(() => {
                createHealthRouter();
                routeHandler = mockExpressRouter.get.mock.calls.find(
                    (call: [string, unknown]) => call[0] === "/detailed",
                )[1];
            });

            it("should return detailed health information", async () => {
                const startTime = Date.now();
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "healthy",
                    latency: 15,
                    connections: {
                        total_connections: 10,
                        active_connections: 3,
                        idle_connections: 7,
                    },
                });
                const mockRedisClient = {
                    ping: jest.fn().mockResolvedValue("PONG"),
                };
                (mockGetRedisClient as any).mockReturnValue(mockRedisClient); // eslint-disable-line @typescript-eslint/no-explicit-any

                // Mock Date.now for consistent timing
                const mockNow = jest.spyOn(Date, "now").mockReturnValue(startTime + 25);

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({
                    status: "healthy",
                    timestamp: expect.any(String),
                    latency: {
                        total: expect.any(String),
                        database: expect.any(String),
                        redis: null,
                    },
                    services: {
                        database: {
                            status: "healthy",
                            latency: expect.any(String),
                            connections: {
                                total_connections: 10,
                                active_connections: 3,
                                idle_connections: 7,
                            },
                        },
                        redis: {
                            status: "healthy",
                            latency: null,
                        },
                    },
                    uptime: expect.any(Number),
                    memory: expect.any(Object),
                });

                mockNow.mockRestore();
            });

            it("should handle Redis not configured", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "healthy",
                    latency: 10,
                    connections: {
                        total_connections: 5,
                        active_connections: 2,
                        idle_connections: 3,
                    },
                });
                (mockGetRedisClient as any).mockReturnValue(null); // eslint-disable-line @typescript-eslint/no-explicit-any

                await routeHandler(req, res);

                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        services: expect.objectContaining({
                            redis: {
                                status: "not configured",
                                latency: null,
                            },
                        }),
                    }),
                );
            });
        });

        describe("GET /ready", () => {
            let routeHandler: any; // eslint-disable-line @typescript-eslint/no-explicit-any

            beforeEach(() => {
                createHealthRouter();
                routeHandler = mockExpressRouter.get.mock.calls.find(
                    (call: [string, unknown]) => call[0] === "/ready",
                )[1];
            });

            it("should return ready status when database is healthy", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "healthy",
                    latency: 10,
                    connections: {
                        total_connections: 5,
                        active_connections: 2,
                        idle_connections: 3,
                    },
                });

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({
                    status: "ready",
                    timestamp: expect.any(String),
                });
            });

            it("should return not ready when database is unhealthy", async () => {
                mockCheckDatabaseHealth.mockResolvedValue({
                    status: "unhealthy",
                    latency: 10,
                    error: "Connection failed",
                });

                await routeHandler(req, res);

                expect(res.status).toHaveBeenCalledWith(503);
                expect(res.json).toHaveBeenCalledWith({
                    status: "not ready",
                    timestamp: expect.any(String),
                    error: "Database not ready: Connection failed",
                });
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Readiness check failed",
                    expect.any(Error),
                );
            });
        });
    });
});
