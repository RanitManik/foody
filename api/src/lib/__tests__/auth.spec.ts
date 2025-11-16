import { generateToken, getUserFromToken, extractToken } from "../auth";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

// Mock jwt
jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

// Mock Prisma
jest.mock("../database", () => ({
    prisma: {
        users: {
            findUnique: jest.fn(),
        },
    },
}));

// Mock logger
jest.mock("../shared/logger", () => ({
    logger: {
        debug: jest.fn(),
    },
}));

import { prisma } from "../database";
import { logger } from "../shared/logger";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe("Auth Utilities", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: "test-secret" };
        // Reset JWT mocks with default behavior
        (mockJwt.sign as jest.Mock).mockImplementation((payload: { userId: string }) => {
            return `mocked-token-${payload.userId}`;
        });
        (mockJwt.verify as jest.Mock).mockImplementation((token: string) => {
            if (token === "invalid-token") {
                throw new Error("invalid signature");
            }
            if (token === "expired-token") {
                throw new Error("jwt expired");
            }
            // Extract userId from mocked token
            const userId = token.replace("mocked-token-", "");
            return { userId, iat: 1000, exp: 2000 };
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("generateToken", () => {
        it("should generate a valid JWT token", () => {
            const userId = "user-123";
            const token = generateToken(userId);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                { userId },
                "your-super-secret-jwt-key-change-this-in-production",
                { expiresIn: "7d" },
            );
            expect(token).toBe("mocked-token-user-123");
        });

        it("should include userId in token payload", () => {
            const userId = "user-456";
            generateToken(userId);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                { userId },
                "your-super-secret-jwt-key-change-this-in-production",
                { expiresIn: "7d" },
            );
        });

        it("should use custom expiration time", () => {
            process.env.JWT_EXPIRES_IN = "1h";
            const userId = "user-789";
            generateToken(userId);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                { userId },
                "your-super-secret-jwt-key-change-this-in-production",
                { expiresIn: "1h" },
            );
        });

        it("should use default expiration time", () => {
            const userId = "user-999";
            generateToken(userId);

            expect(mockJwt.sign).toHaveBeenCalledWith(
                { userId },
                "your-super-secret-jwt-key-change-this-in-production",
                { expiresIn: "7d" },
            );
        });
    });

    describe("getUserFromToken", () => {
        it("should return null for null token", async () => {
            const result = await getUserFromToken(null);
            expect(result).toBeNull();
        });

        it("should return null for undefined token", async () => {
            const result = await getUserFromToken(undefined);
            expect(result).toBeNull();
        });

        it("should return null for empty token", async () => {
            const result = await getUserFromToken("");
            expect(result).toBeNull();
        });

        it("should return user for valid token", async () => {
            const userId = "user-123";
            const token = generateToken(userId);
            const mockUser = {
                id: userId,
                email: "test@example.com",
                role: UserRole.MEMBER,
                assignedLocation: "mumbai",
                firstName: "Test",
                lastName: "User",
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await getUserFromToken(token);
            expect(result).toEqual(mockUser);
            expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
                where: { id: userId },
            });
        });

        it("should return null for invalid token", async () => {
            const result = await getUserFromToken("invalid-token");
            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it("should return null for expired token", async () => {
            const result = await getUserFromToken("expired-token");
            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it("should return null when user not found in database", async () => {
            const userId = "nonexistent-user";
            const token = generateToken(userId);

            (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await getUserFromToken(token);
            expect(result).toBeNull();
        });
    });

    describe("extractToken", () => {
        describe("from authHeader", () => {
            it("should extract token from Bearer header", () => {
                const result = extractToken({ authHeader: "Bearer abc123" });
                expect(result).toBe("abc123");
            });

            it("should handle case insensitive Bearer", () => {
                const result = extractToken({ authHeader: "bearer xyz789" });
                expect(result).toBe("xyz789");
            });

            it("should handle extra spaces", () => {
                const result = extractToken({ authHeader: "Bearer   token123   " });
                expect(result).toBe("token123");
            });

            it("should return header as-is when no Bearer prefix", () => {
                const result = extractToken({ authHeader: "InvalidHeader" });
                expect(result).toBe("InvalidHeader");
            });

            it("should handle array authHeader", () => {
                const result = extractToken({ authHeader: "Bearer array-token" });
                expect(result).toBe("array-token");
            });
        });

        describe("from connectionParams", () => {
            it("should extract from authorization param", () => {
                const result = extractToken({
                    connectionParams: { authorization: "Bearer ws-token" },
                });
                expect(result).toBe("ws-token");
            });

            it("should extract from Authorization param (case sensitive)", () => {
                const result = extractToken({
                    connectionParams: { Authorization: "Bearer ws-token-case" },
                });
                expect(result).toBe("ws-token-case");
            });

            it("should extract from authToken param", () => {
                const result = extractToken({
                    connectionParams: { authToken: "auth-token-123" },
                });
                expect(result).toBe("auth-token-123");
            });

            it("should extract from token param", () => {
                const result = extractToken({
                    connectionParams: { token: "simple-token" },
                });
                expect(result).toBe("simple-token");
            });

            it("should prioritize authorization over other params", () => {
                const result = extractToken({
                    connectionParams: {
                        authorization: "Bearer auth-param",
                        authToken: "auth-token-param",
                        token: "token-param",
                    },
                });
                expect(result).toBe("auth-param");
            });
        });

        it("should return null when no token found", () => {
            const result = extractToken({});
            expect(result).toBeNull();
        });
    });
});
