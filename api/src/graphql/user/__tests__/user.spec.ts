import { userResolvers } from "../resolver";
import { UserRole } from "@prisma/client";

// Mock dependencies
jest.mock("bcryptjs", () => ({
    hash: jest.fn(),
}));

jest.mock("../../../lib/database", () => ({
    prisma: {
        users: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        restaurants: {
            findUnique: jest.fn(),
        },
    },
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
    CreateUserInputSchema: {},
    UpdateUserInputSchema: {},
    validationSchemas: {
        id: {},
    },
}));

jest.mock("../../../lib/shared/pagination", () => ({
    parsePagination: jest.fn(),
}));

jest.mock("../../../lib/shared/cache", () => ({
    withCache: jest.fn(),
    deleteCacheByPattern: jest.fn(),
    CACHE_TTL: {
        USER_DATA: 300,
    },
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput, validationSchemas } from "../../../lib/shared/validation";
import { parsePagination } from "../../../lib/shared/pagination";
import { withCache, deleteCacheByPattern } from "../../../lib/shared/cache";
import bcrypt from "bcryptjs";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;
const mockParsePagination = parsePagination as jest.Mock;
const mockWithCache = withCache as jest.Mock;
const mockDeleteCacheByPattern = deleteCacheByPattern as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;

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

describe("User Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        validationSchemas.id.parse = jest.fn().mockImplementation((id) => id);
        mockParsePagination.mockReturnValue({ first: 10, skip: 0 });
        mockWithCache.mockImplementation((key, fn) => fn());
        mockBcryptHash.mockResolvedValue("hashed-password");
        mockGraphQLErrors.unauthenticated.mockImplementation(() => {
            throw new Error("Not authenticated");
        });
        mockGraphQLErrors.badInput.mockImplementation((msg?: string) => {
            throw new Error(msg || "Bad input");
        });
        mockGraphQLErrors.forbidden.mockImplementation((msg?: string) => {
            throw new Error(msg || "Forbidden");
        });
        mockGraphQLErrors.notFound.mockImplementation((msg?: string) => {
            throw new Error(msg || "Not found");
        });
    });

    describe("Query", () => {
        describe("users", () => {
            it("should return users for admin", async () => {
                const mockUsers = [
                    {
                        id: "user-1",
                        email: "user1@example.com",
                        firstName: "User",
                        lastName: "One",
                        role: UserRole.MEMBER,
                        restaurantId: "rest-1",
                        isActive: true,
                        restaurant: { id: "rest-1", name: "Restaurant 1" },
                    },
                ];

                (mockPrisma.users.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.users.findMany as jest.Mock).mockResolvedValue(mockUsers);

                const context = createContext({ user: buildAdminUser() });
                const result = await userResolvers.Query?.users?.(null, {}, context);

                expect(result).toEqual({
                    users: mockUsers,
                    totalCount: 1,
                });
                expect(mockWithCache).toHaveBeenCalled();
            });

            it("should deny access for non-admin", async () => {
                const context = createContext({
                    user: {
                        id: "member-1",
                        role: UserRole.MEMBER,
                        email: "member@example.com",
                    } as GraphQLContext["user"],
                });

                await expect(userResolvers.Query?.users?.(null, {}, context)).rejects.toThrow();
                expect(mockGraphQLErrors.forbidden).toHaveBeenCalled();
            });
        });

        describe("user", () => {
            it("should return user for admin", async () => {
                const mockUser = {
                    id: "user-1",
                    email: "user1@example.com",
                    firstName: "User",
                    lastName: "One",
                    role: UserRole.MEMBER,
                    restaurantId: "rest-1",
                    isActive: true,
                    restaurant: { id: "rest-1", name: "Restaurant 1" },
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

                const context = createContext({ user: buildAdminUser() });
                const result = await userResolvers.Query?.user?.(null, { id: "user-1" }, context);

                expect(result).toEqual(mockUser);
                expect(mockWithCache).toHaveBeenCalledWith(
                    "user:user-1",
                    expect.any(Function),
                    300,
                );
            });

            it("should deny access for non-admin", async () => {
                const context = createContext({
                    user: {
                        id: "member-1",
                        role: UserRole.MEMBER,
                        email: "member@example.com",
                    } as GraphQLContext["user"],
                });

                await expect(
                    userResolvers.Query?.user?.(null, { id: "user-1" }, context),
                ).rejects.toThrow();
                expect(mockGraphQLErrors.forbidden).toHaveBeenCalled();
            });
        });
    });

    describe("Mutation", () => {
        describe("createUser", () => {
            const validInput = {
                email: "newuser@example.com",
                password: "password123",
                firstName: "New",
                lastName: "User",
                role: UserRole.MEMBER,
                restaurantId: "restaurant-123",
                isActive: true,
            };

            it("should create user for admin", async () => {
                const mockCreatedUser = {
                    id: "new-user",
                    email: validInput.email,
                    firstName: validInput.firstName,
                    lastName: validInput.lastName,
                    role: validInput.role,
                    restaurantId: validInput.restaurantId,
                    isActive: validInput.isActive,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null);
                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue({
                    id: "restaurant-123",
                });
                (mockPrisma.users.create as jest.Mock).mockResolvedValue(mockCreatedUser);

                const context = createContext({ user: buildAdminUser() });
                const result = await userResolvers.Mutation?.createUser?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedUser);
                expect(mockBcryptHash).toHaveBeenCalledWith(validInput.password, 12);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("users:admin:*");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("user:*");
            });

            it("should deny creation for non-admin", async () => {
                const context = createContext({
                    user: {
                        id: "member-1",
                        role: UserRole.MEMBER,
                        email: "member@example.com",
                    } as GraphQLContext["user"],
                });

                await expect(
                    userResolvers.Mutation?.createUser?.(null, { input: validInput }, context),
                ).rejects.toThrow("Admin access required to create users");
            });

            it("should throw error for existing user", async () => {
                const existingUser = { id: "existing", email: validInput.email };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(existingUser);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    userResolvers.Mutation?.createUser?.(null, { input: validInput }, context),
                ).rejects.toThrow("User already exists");
            });

            it("should require restaurant for non-admin roles", async () => {
                const inputWithoutRestaurant = {
                    ...validInput,
                    role: UserRole.MEMBER,
                    restaurantId: undefined,
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    userResolvers.Mutation?.createUser?.(
                        null,
                        { input: inputWithoutRestaurant },
                        context,
                    ),
                ).rejects.toThrow("Managers and members must have an assigned restaurant");
            });
        });

        describe("updateUser", () => {
            const updateInput = {
                firstName: "Updated",
                lastName: "Name",
            };

            it("should update user for admin", async () => {
                const existingUser = {
                    id: "user-1",
                    email: "user@example.com",
                    firstName: "Old",
                    lastName: "Name",
                    role: UserRole.MEMBER,
                    restaurantId: "rest-1",
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                const updatedUser = {
                    ...existingUser,
                    firstName: "Updated",
                    lastName: "Name",
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(existingUser);
                (mockPrisma.users.update as jest.Mock).mockResolvedValue(updatedUser);

                const context = createContext({ user: buildAdminUser() });
                const result = await userResolvers.Mutation?.updateUser?.(
                    null,
                    { id: "user-1", input: updateInput },
                    context,
                );

                expect(result).toEqual(updatedUser);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("users:admin:*");
            });

            it("should prevent self-deactivation", async () => {
                const existingUser = {
                    id: "admin-123", // Same as context user
                    role: UserRole.ADMIN,
                    isActive: true,
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(existingUser);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    userResolvers.Mutation?.updateUser?.(
                        null,
                        { id: "admin-123", input: { isActive: false } },
                        context,
                    ),
                ).rejects.toThrow("You cannot deactivate your own account");
            });

            it("should prevent self-deactivation", async () => {
                const context = createContext({ user: buildAdminUser() });

                await expect(
                    userResolvers.Mutation?.updateUser?.(
                        null,
                        { id: "admin-123", input: { isActive: false } },
                        context,
                    ),
                ).rejects.toThrow("You cannot deactivate your own account");
            });
        });

        describe("deleteUser", () => {
            it("should delete user for admin", async () => {
                const userToDelete = {
                    id: "user-1",
                    email: "user@example.com",
                    firstName: "User",
                    lastName: "One",
                    role: UserRole.MEMBER,
                    restaurantId: "rest-1",
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(userToDelete);

                const context = createContext({ user: buildAdminUser() });
                const result = await userResolvers.Mutation?.deleteUser?.(
                    null,
                    { id: "user-1" },
                    context,
                );

                expect(result).toBe(true);
                expect(mockPrisma.users.delete).toHaveBeenCalledWith({
                    where: { id: "user-1" },
                });
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("users:admin:*");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("user:*");
            });

            it("should deny deletion for non-admin", async () => {
                const context = createContext({
                    user: {
                        id: "member-1",
                        role: UserRole.MEMBER,
                        email: "member@example.com",
                    } as GraphQLContext["user"],
                });

                await expect(
                    userResolvers.Mutation?.deleteUser?.(null, { id: "user-1" }, context),
                ).rejects.toThrow("Admin access required to delete users");
            });

            it("should prevent deleting admin accounts", async () => {
                const adminUser = {
                    id: "admin-2",
                    email: "admin@example.com",
                    role: UserRole.ADMIN,
                    restaurantId: null,
                };

                (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(adminUser);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    userResolvers.Mutation?.deleteUser?.(null, { id: "admin-2" }, context),
                ).rejects.toThrow("Admin accounts cannot be deleted");
            });
        });
    });
});
