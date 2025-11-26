import { setupLoggingMiddleware } from "../logging";
import { Request, Response } from "express";
import { logger } from "../../lib/shared/logger";

// Mock logger
jest.mock("../../lib/shared/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("Logging Middleware", () => {
    let app: { use: jest.Mock };
    let req: Partial<Request>;
    let res: Partial<Response> & { on: jest.Mock; statusCode: number; get: jest.Mock };
    let next: jest.Mock;

    beforeEach(() => {
        app = {
            use: jest.fn(),
        };
        req = {
            method: "GET" as any,
            url: "/test",
            headers: { "x-request-id": "test-id" } as any,
            get: jest.fn().mockReturnValue("test-agent"),
            ip: "127.0.0.1",
        };
        res = {
            statusCode: 200,
            get: jest.fn().mockReturnValue("123"),
            on: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should log request start and setup finish listener", () => {
        setupLoggingMiddleware(app as any);

        const middleware = (app.use as jest.Mock).mock.calls[0][0];

        middleware(req, res, next);

        expect(mockLogger.info).toHaveBeenCalledWith("Request started", {
            requestId: "test-id",
            method: "GET",
            url: "/test",
            userAgent: "test-agent",
            ip: "127.0.0.1",
        });

        expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
        expect(next).toHaveBeenCalled();
    });

    it("should log request completion on finish", () => {
        setupLoggingMiddleware(app as any);

        const middleware = (app.use as jest.Mock).mock.calls[0][0];

        middleware(req, res, next);

        const finishCallback = res.on.mock.calls[0][1];

        // Simulate finish
        finishCallback();

        expect(mockLogger.info).toHaveBeenCalledWith("Request completed", {
            requestId: "test-id",
            method: "GET",
            url: "/test",
            statusCode: 200,
            duration: expect.stringMatching(/\d+ms/),
            contentLength: "123",
        });
    });
});
