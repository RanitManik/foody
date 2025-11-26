import { authResolvers } from "../resolver";
import { UserRole } from "@prisma/client";

// Mock dependencies
jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        users: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        restaurants: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock("../../../lib/auth", () => ({
    generateToken: jest.fn(),
}));

jest.mock("../../../lib/shared/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/errors", () => ({
    GraphQLErrors: {
        unauthenticated: jest.fn(),
        badInput: jest.fn(),
        forbidden: jest.fn(),
        notFound: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/validation", () => ({
    validateInput: jest.fn(),
    RegisterInputSchema: {},
    LoginInputSchema: {},
    validateEmail: jest.fn(),
    validationSchemas: {
        email: {},
        cuid: {},
    },
}));

import { prisma } from "../../../lib/database";
import { generateToken } from "../../../lib/auth";
import { logger } from "../../../lib/shared/logger";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput, validateEmail } from "../../../lib/shared/validation";
import bcrypt from "bcryptjs";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGenerateToken = generateToken as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;
const mockValidateEmail = validateEmail as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

const createContext = (overrides: Partial<GraphQLContext> = {}): GraphQLContext => ({
    prisma: mockPrisma as unknown as GraphQLContext["prisma"],
    user: null,
    ...overrides,
});

const buildAdminUser = () => ({
    id: "admin-123",
    email: "admin@example.com",
    role: UserRole.ADMIN,
    restaurantId: null,
    firstName: "Admin",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe("Auth Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        mockValidateEmail.mockImplementation((email) => email);
        mockBcryptCompare.mockResolvedValue(true); // Default to valid password
        (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue({
            id: "restaurant-123",
            name: "Test Restaurant",
            location: "test-location",
        });
        mockGenerateToken.mockReturnValue("mock-jwt-token");
        mockGraphQLErrors.unauthenticated.mockImplementation(() => {
            throw new Error("Not authenticated");
        });
        mockGraphQLErrors.badInput.mockImplementation((message) => {
            throw new Error(message);
        });
        mockGraphQLErrors.forbidden.mockImplementation((message) => {
            throw new Error(message);
        });
        mockGraphQLErrors.notFound.mockImplementation((message) => {
            throw new Error(message);
        });
    });

    describe("Query", () => {
        describe("me", () => {
            it("should return user when authenticated", () => {
                const mockUser = {
                    id: "user-123",
                    email: "test@example.com",
                    role: UserRole.MEMBER,
                    restaurantId: "restaurant-123",
                    firstName: "Test",
                    lastName: "User",
                    isActive: true,
                    password: "hashed-password",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const context = createContext({ user: mockUser });
                const result = authResolvers.Query?.me?.(null, {}, context);

                expect(result).toEqual(mockUser);
            });

            it("should throw unauthenticated error when not authenticated", () => {
                const context = createContext();

                expect(() => authResolvers.Query?.me?.(null, {}, context)).toThrow(
                    "Not authenticated",
                );
                expect(mockGraphQLErrors.unauthenticated).toHaveBeenCalled();
            });
        });
    });

    describe("Mutation", () => {
        describe("register", () => {
            const validInput = {
                email: "test@example.com",
                password: "password123",
                firstName: "Test",
                lastName: "User",
                role: UserRole.MEMBER,
                restaurantId: "restaurant-123",
            };

            it("should register user successfully", async () => {
                const mockCreatedUser = {
                    id: "user-123",
                    ...validInput,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
                (mockPrisma.users.create as jest.Mock).mockResolvedValue(mockCreatedUser);

                const result = await authResolvers.Mutation?.register?.(
                    null,
                    {
                        input: validInput,
                    },
                    createContext({
                        user: buildAdminUser() as unknown as GraphQLContext["user"],
                    }),
                );

                expect(mockValidateInput).toHaveBeenCalled();
                expect(mockPrisma.restaurants.findUnique).toHaveBeenCalledWith({
                    where: { id: validInput.restaurantId },
                    select: { id: true, name: true, location: true },
                });
                expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
                    where: { email: validInput.email },
                });
                expect(mockPrisma.users.create).toHaveBeenCalled();
                expect(mockGenerateToken).toHaveBeenCalledWith(mockCreatedUser.id);
                expect(mockLogger.info).toHaveBeenCalled();
                expect(result).toEqual({
                    token: "mock-jwt-token",
                    user: mockCreatedUser,
                });
            });

            it("should throw error for existing user", async () => {
                const existingUser = { id: "existing-user", email: validInput.email };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(existingUser);

                await expect(
                    authResolvers.Mutation?.register?.(
                        null,
                        { input: validInput },
                        createContext({
                            user: buildAdminUser() as unknown as GraphQLContext["user"],
                        }),
                    ),
                ).rejects.toThrow();

                expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith("User already exists");
                expect(mockLogger.warn).toHaveBeenCalled();
            });

            it("should handle validation errors", async () => {
                mockValidateInput.mockImplementation(() => {
                    throw new Error("Validation failed");
                });

                await expect(
                    authResolvers.Mutation?.register?.(
                        null,
                        { input: validInput },
                        createContext({
                            user: buildAdminUser() as unknown as GraphQLContext["user"],
                        }),
                    ),
                ).rejects.toThrow("Validation failed");

                expect(mockLogger.error).toHaveBeenCalled();
            });
            it("should forbid non-admin registration attempts", async () => {
                await expect(
                    authResolvers.Mutation?.register?.(
                        null,
                        { input: validInput },
                        createContext({
                            user: {
                                id: "manager-1",
                                email: "manager@example.com",
                                role: UserRole.MANAGER,
                                restaurantId: "restaurant-123",
                                firstName: "Manager",
                                lastName: "User",
                                isActive: true,
                                password: "hashed",
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            } as unknown as GraphQLContext["user"],
                        }),
                    ),
                ).rejects.toThrow("Only admins can register new users");

                expect(mockGraphQLErrors.forbidden).toHaveBeenCalledWith(
                    "Only admins can register new users",
                );
            });
        });

        describe("login", () => {
            const validInput = {
                email: "test@example.com",
                password: "password123",
            };

            it("should login user successfully", async () => {
                const mockUser = {
                    id: "user-123",
                    email: validInput.email,
                    password: "hashed-password",
                    role: UserRole.MEMBER,
                    restaurantId: "restaurant-123",
                    firstName: "Test",
                    lastName: "User",
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // Mock bcrypt.compare to return true
                const bcrypt = require("bcryptjs");
                jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

                const result = await authResolvers.Mutation?.login?.(null, { input: validInput });

                expect(mockValidateInput).toHaveBeenCalled();
                expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
                    where: { email: validInput.email },
                });
                expect(mockGenerateToken).toHaveBeenCalledWith(mockUser.id);
                expect(mockLogger.info).toHaveBeenCalled();
                expect(result).toEqual({
                    token: "mock-jwt-token",
                    user: mockUser,
                });
            });

            it("should throw error for non-existent user", async () => {
                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null);

                await expect(
                    authResolvers.Mutation?.login?.(null, { input: validInput }),
                ).rejects.toThrow();

                expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith("Invalid credentials");
                expect(mockLogger.warn).toHaveBeenCalled();
            });

            it("should throw error for inactive user", async () => {
                const inactiveUser = {
                    id: "user-123",
                    email: validInput.email,
                    isActive: false,
                    password: "hashed-password",
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

                await expect(
                    authResolvers.Mutation?.login?.(null, { input: validInput }),
                ).rejects.toThrow("Account is inactive. Please contact support.");

                expect(mockGraphQLErrors.forbidden).toHaveBeenCalled();
            });

            it("should throw error for wrong password", async () => {
                const mockUser = {
                    id: "user-123",
                    email: validInput.email,
                    password: "hashed-password",
                    isActive: true,
                };

                mockBcryptCompare.mockResolvedValue(false);
                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

                await expect(
                    authResolvers.Mutation?.login?.(null, { input: validInput }),
                ).rejects.toThrow();

                expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith("Invalid credentials");
                expect(mockLogger.warn).toHaveBeenCalled();
            });
        });
    });
});
