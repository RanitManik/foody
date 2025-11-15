import { API_CONSTANTS } from "../shared/constants";

describe("API Constants", () => {
    describe("RATE_LIMIT", () => {
        it("should have correct window and max requests", () => {
            expect(API_CONSTANTS.RATE_LIMIT.WINDOW_MS).toBe(900000);
            expect(API_CONSTANTS.RATE_LIMIT.MAX_REQUESTS).toBe(100);
        });
    });

    describe("AUTH_RATE_LIMIT", () => {
        it("should have correct window and max requests", () => {
            expect(API_CONSTANTS.AUTH_RATE_LIMIT.WINDOW_MS).toBe(60000);
            expect(API_CONSTANTS.AUTH_RATE_LIMIT.MAX_REQUESTS).toBe(5);
        });
    });

    describe("REQUEST_TIMEOUT_MS", () => {
        it("should be set to 30 seconds", () => {
            expect(API_CONSTANTS.REQUEST_TIMEOUT_MS).toBe(30000);
        });
    });

    describe("BODY_PARSER_LIMIT", () => {
        it("should be set to 1mb", () => {
            expect(API_CONSTANTS.BODY_PARSER_LIMIT).toBe("1mb");
        });
    });

    describe("GRAPHQL", () => {
        it("should have correct depth and complexity limits", () => {
            expect(API_CONSTANTS.GRAPHQL.MAX_DEPTH).toBe(10);
            expect(API_CONSTANTS.GRAPHQL.MAX_COMPLEXITY).toBe(2000);
        });
    });

    describe("DATABASE", () => {
        it("should have correct connection and timeout settings", () => {
            expect(API_CONSTANTS.DATABASE.CONNECTION_LIMIT).toBe(10);
            expect(API_CONSTANTS.DATABASE.POOL_TIMEOUT_SECONDS).toBe(20);
            expect(API_CONSTANTS.DATABASE.QUERY_TIMEOUT_MS).toBe(30000);
            expect(API_CONSTANTS.DATABASE.HEALTH_CHECK_TIMEOUT_MS).toBe(5000);
        });
    });

    describe("SERVER", () => {
        it("should have correct server configuration", () => {
            expect(API_CONSTANTS.SERVER.SHUTDOWN_TIMEOUT_MS).toBe(15000);
            expect(API_CONSTANTS.SERVER.DEFAULT_HOST).toBe("localhost");
            expect(API_CONSTANTS.SERVER.DEFAULT_PORT).toBe(4000);
        });
    });
});
