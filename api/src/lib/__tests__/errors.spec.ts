import { GraphQLErrors, ErrorCode, createGraphQLError } from "../shared/errors";
import { GraphQLError } from "graphql";

describe("Error Utilities", () => {
    describe("ErrorCode enum", () => {
        it("should have correct error codes", () => {
            expect(ErrorCode.UNAUTHENTICATED).toBe("UNAUTHENTICATED");
            expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
            expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
            expect(ErrorCode.BAD_USER_INPUT).toBe("BAD_USER_INPUT");
            expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe("INTERNAL_SERVER_ERROR");
        });
    });

    describe("createGraphQLError", () => {
        it("should create GraphQL error with code", () => {
            const error = createGraphQLError("Test message", ErrorCode.BAD_USER_INPUT);

            expect(error).toBeInstanceOf(GraphQLError);
            expect(error.message).toBe("Test message");
            expect(error.extensions).toEqual({
                code: ErrorCode.BAD_USER_INPUT,
            });
        });

        it("should include original error in development", () => {
            // Mock process.env.NODE_ENV
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "development";

            const originalError = new Error("Original error");
            const error = createGraphQLError(
                "Test message",
                ErrorCode.INTERNAL_SERVER_ERROR,
                originalError,
            );

            expect(error.extensions).toEqual({
                code: ErrorCode.INTERNAL_SERVER_ERROR,
                originalError: "Original error",
            });

            // Restore original env
            process.env.NODE_ENV = originalEnv;
        });

        it("should not include original error in production", () => {
            // Mock process.env.NODE_ENV
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";

            const originalError = new Error("Original error");
            const error = createGraphQLError(
                "Test message",
                ErrorCode.INTERNAL_SERVER_ERROR,
                originalError,
            );

            expect(error.extensions).toEqual({
                code: ErrorCode.INTERNAL_SERVER_ERROR,
            });

            // Restore original env
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe("GraphQLErrors helper functions", () => {
        describe("unauthenticated", () => {
            it("should create unauthenticated error with default message", () => {
                const error = GraphQLErrors.unauthenticated();

                expect(error).toBeInstanceOf(GraphQLError);
                expect(error.message).toBe("Not authenticated");
                expect(error.extensions).toEqual({
                    code: ErrorCode.UNAUTHENTICATED,
                });
            });

            it("should create unauthenticated error with custom message", () => {
                const error = GraphQLErrors.unauthenticated("Custom auth message");

                expect(error.message).toBe("Custom auth message");
                expect(error.extensions).toEqual({
                    code: ErrorCode.UNAUTHENTICATED,
                });
            });
        });

        describe("forbidden", () => {
            it("should create forbidden error with default message", () => {
                const error = GraphQLErrors.forbidden();

                expect(error.message).toBe("Access denied");
                expect(error.extensions).toEqual({
                    code: ErrorCode.FORBIDDEN,
                });
            });

            it("should create forbidden error with custom message", () => {
                const error = GraphQLErrors.forbidden("Custom forbidden message");

                expect(error.message).toBe("Custom forbidden message");
                expect(error.extensions).toEqual({
                    code: ErrorCode.FORBIDDEN,
                });
            });
        });

        describe("notFound", () => {
            it("should create not found error", () => {
                const error = GraphQLErrors.notFound("Resource not found");

                expect(error.message).toBe("Resource not found");
                expect(error.extensions).toEqual({
                    code: ErrorCode.NOT_FOUND,
                });
            });
        });

        describe("badInput", () => {
            it("should create bad input error", () => {
                const error = GraphQLErrors.badInput("Invalid input provided");

                expect(error.message).toBe("Invalid input provided");
                expect(error.extensions).toEqual({
                    code: ErrorCode.BAD_USER_INPUT,
                });
            });
        });

        describe("internal", () => {
            it("should create internal error with default message", () => {
                const error = GraphQLErrors.internal();

                expect(error.message).toBe("Internal server error");
                expect(error.extensions).toEqual({
                    code: ErrorCode.INTERNAL_SERVER_ERROR,
                });
            });

            it("should create internal error with custom message", () => {
                const error = GraphQLErrors.internal("Custom internal error");

                expect(error.message).toBe("Custom internal error");
                expect(error.extensions).toEqual({
                    code: ErrorCode.INTERNAL_SERVER_ERROR,
                });
            });

            it("should include original error in development", () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = "development";

                const originalError = new Error("Database connection failed");
                const error = GraphQLErrors.internal("Custom internal error", originalError);

                expect(error.extensions).toEqual({
                    code: ErrorCode.INTERNAL_SERVER_ERROR,
                    originalError: "Database connection failed",
                });

                process.env.NODE_ENV = originalEnv;
            });
        });
    });
});
