import { setupRateLimitMiddleware } from "../rate-limit";
import rateLimit from "express-rate-limit";
import { API_CONSTANTS } from "../../lib/shared/constants";
import { getRedisClient } from "../../lib/shared/cache";

// Mock dependencies
jest.mock("express-rate-limit");
jest.mock("../../lib/shared/cache");
jest.mock("../../lib/shared/constants", () => ({
    API_CONSTANTS: {
        RATE_LIMIT: {
            WINDOW_MS: 15 * 60 * 1000,
            MAX_REQUESTS: 100,
        },
        AUTH_RATE_LIMIT: {
            WINDOW_MS: 60 * 1000,
            MAX_REQUESTS: 5,
        },
    },
}));

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

describe("Rate Limit Middleware", () => {
    let app: { use: jest.Mock };
    let mockLimiter: jest.Mock;

    beforeEach(() => {
        app = {
            use: jest.fn(),
        };
        mockLimiter = jest.fn();
        mockRateLimit.mockReturnValue(mockLimiter as any);
        mockGetRedisClient.mockReturnValue(null); // No Redis client, use memory store
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should setup rate limiters correctly", () => {
        setupRateLimitMiddleware(app as any);

        // Should create multiple limiters
        expect(mockRateLimit).toHaveBeenCalledTimes(4);

        // Check general limiter
        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({
                windowMs: API_CONSTANTS.RATE_LIMIT.WINDOW_MS,
                max: API_CONSTANTS.RATE_LIMIT.MAX_REQUESTS,
                standardHeaders: true,
                legacyHeaders: false,
            }),
        );

        // Check auth limiter
        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({
                windowMs: API_CONSTANTS.AUTH_RATE_LIMIT.WINDOW_MS,
                max: API_CONSTANTS.AUTH_RATE_LIMIT.MAX_REQUESTS,
            }),
        );

        // Check that app.use is called for routes
        expect(app.use).toHaveBeenCalledWith("/health", mockLimiter);
        expect(app.use).toHaveBeenCalledWith("/auth", mockLimiter);
        expect(app.use).toHaveBeenCalledWith("/graphql", mockLimiter);
        expect(app.use).toHaveBeenCalledWith(expect.any(Function)); // For intensive operations
    });

    it("should use memory store when no Redis client", () => {
        setupRateLimitMiddleware(app as any);

        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.not.objectContaining({
                store: expect.any(Object),
            }),
        );
    });

    it("should skip rate limiting for health checks in development", () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        setupRateLimitMiddleware(app as any);

        expect(mockRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: expect.any(Function),
            }),
        );

        process.env.NODE_ENV = originalEnv;
    });
});
