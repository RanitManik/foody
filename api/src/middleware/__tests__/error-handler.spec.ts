import { setupErrorHandlerMiddleware } from "../error-handler";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

jest.mock("../../lib/shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock console methods to prevent test output pollution
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

describe("Error Handler Middleware", () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    it("should handle unhandled errors and return 500", async () => {
        // Add middleware that throws an error
        app.get("/error", (req: Request, res: Response, next: NextFunction) => {
            next(new Error("Test error"));
        });

        // Add the error handler
        setupErrorHandlerMiddleware(app);

        const response = await request(app).get("/error");

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Internal Server Error");
        expect(response.body.requestId).toBeUndefined(); // No request-id header
    });

    it("should include error message in development", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        app.get("/error", (req: Request, res: Response, next: NextFunction) => {
            next(new Error("Test error"));
        });

        setupErrorHandlerMiddleware(app);

        const response = await request(app).get("/error");

        expect(response.status).toBe(500);
        expect(response.body.message).toBe("Test error");

        process.env.NODE_ENV = originalEnv;
    });

    it("should include requestId if present", async () => {
        app.get("/error", (req: Request, res: Response, next: NextFunction) => {
            next(new Error("Test error"));
        });

        setupErrorHandlerMiddleware(app);

        const response = await request(app).get("/error").set("x-request-id", "test-request-id");

        expect(response.status).toBe(500);
        expect(response.body.requestId).toBe("test-request-id");
    });
});
