import { setupMiddleware } from "../index";

// Mock all middleware setup functions
jest.mock("../request-id", () => ({
    setupRequestIdMiddleware: jest.fn(),
}));

jest.mock("../security", () => ({
    setupSecurityMiddleware: jest.fn(() => ({ origins: ["http://localhost:3000"] })),
}));

jest.mock("../timeout", () => ({
    setupTimeoutMiddleware: jest.fn(),
}));

jest.mock("../rate-limit", () => ({
    setupRateLimitMiddleware: jest.fn(),
}));

jest.mock("../logging", () => ({
    setupLoggingMiddleware: jest.fn(),
}));

jest.mock("../metrics", () => ({
    setupMetricsMiddleware: jest.fn(),
}));

jest.mock("../error-handler", () => ({
    setupErrorHandlerMiddleware: jest.fn(),
}));

import { setupRequestIdMiddleware } from "../request-id";
import { setupSecurityMiddleware } from "../security";
import { setupTimeoutMiddleware } from "../timeout";
import { setupRateLimitMiddleware } from "../rate-limit";
import { setupLoggingMiddleware } from "../logging";
import { setupMetricsMiddleware } from "../metrics";
import { setupErrorHandlerMiddleware } from "../error-handler";

const mockSetupRequestId = setupRequestIdMiddleware as jest.MockedFunction<
    typeof setupRequestIdMiddleware
>;
const mockSetupSecurity = setupSecurityMiddleware as jest.MockedFunction<
    typeof setupSecurityMiddleware
>;
const mockSetupTimeout = setupTimeoutMiddleware as jest.MockedFunction<
    typeof setupTimeoutMiddleware
>;
const mockSetupRateLimit = setupRateLimitMiddleware as jest.MockedFunction<
    typeof setupRateLimitMiddleware
>;
const mockSetupLogging = setupLoggingMiddleware as jest.MockedFunction<
    typeof setupLoggingMiddleware
>;
const mockSetupMetrics = setupMetricsMiddleware as jest.MockedFunction<
    typeof setupMetricsMiddleware
>;
const mockSetupErrorHandler = setupErrorHandlerMiddleware as jest.MockedFunction<
    typeof setupErrorHandlerMiddleware
>;

import express from "express";

describe("Middleware Index", () => {
    let app: express.Application;

    beforeEach(() => {
        app = {} as express.Application;
        jest.clearAllMocks();
    });

    it("should setup all middleware in correct order", () => {
        const result = setupMiddleware(app);

        expect(mockSetupRequestId).toHaveBeenCalledWith(app);
        expect(mockSetupSecurity).toHaveBeenCalledWith(app);
        expect(mockSetupTimeout).toHaveBeenCalledWith(app);
        expect(mockSetupRateLimit).toHaveBeenCalledWith(app);
        expect(mockSetupLogging).toHaveBeenCalledWith(app);
        expect(mockSetupMetrics).toHaveBeenCalledWith(app);
        expect(mockSetupErrorHandler).toHaveBeenCalledWith(app);

        expect(result).toEqual({ origins: ["http://localhost:3000"] });
    });

    it("should return origins from security middleware", () => {
        mockSetupSecurity.mockReturnValue({ origins: ["https://example.com"] });

        const result = setupMiddleware(app);

        expect(result).toEqual({ origins: ["https://example.com"] });
    });
});
