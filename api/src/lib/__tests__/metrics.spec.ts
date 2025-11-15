import { createMetricsRouter } from "../shared/metrics";

// Mock express
jest.mock("express", () => ({
    Router: jest.fn(),
}));

// Mock register
jest.mock("../../metrics", () => ({
    register: {
        contentType: "text/plain; version=0.0.4; charset=utf-8",
        metrics: jest.fn(),
    },
}));

// Mock logger
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { Router } from "express";
import { register } from "../../metrics";
import { logger } from "../shared/logger";

const mockRouter = Router as jest.MockedFunction<typeof Router>;
const mockRegister = register as jest.Mocked<typeof register>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Metrics Router", () => {
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
            set: jest.fn().mockReturnThis(),
            end: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe("createMetricsRouter", () => {
        it("should create a router with metrics endpoint", () => {
            const router = createMetricsRouter();

            expect(mockRouter).toHaveBeenCalled();
            expect(mockExpressRouter.get).toHaveBeenCalledWith("/", expect.any(Function));
            expect(router).toBe(mockExpressRouter);
        });

        describe("GET /", () => {
            let routeHandler: any; // eslint-disable-line @typescript-eslint/no-explicit-any

            beforeEach(() => {
                createMetricsRouter();
                routeHandler = mockExpressRouter.get.mock.calls[0][1];
            });

            it("should return metrics successfully", async () => {
                const mockMetrics =
                    "# HELP test_metric Test metric\n# TYPE test_metric gauge\ntest_metric 1\n";
                mockRegister.metrics.mockResolvedValue(mockMetrics);

                await routeHandler(req, res);

                expect(res.set).toHaveBeenCalledWith("Content-Type", register.contentType);
                expect(mockRegister.metrics).toHaveBeenCalled();
                expect(res.end).toHaveBeenCalledWith(mockMetrics);
            });

            it("should handle metrics collection errors", async () => {
                const error = new Error("Metrics collection failed");
                mockRegister.metrics.mockRejectedValue(error);

                await routeHandler(req, res);

                expect(mockLogger.error).toHaveBeenCalledWith("Metrics collection failed", error);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.end).toHaveBeenCalled();
            });
        });
    });
});
