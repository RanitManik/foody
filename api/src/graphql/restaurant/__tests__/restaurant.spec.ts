import { restaurantResolvers } from "../resolver";
import { UserRole, restaurants } from "@prisma/client";

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        restaurants: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        menu_items: {
            findMany: jest.fn(),
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
    CreateRestaurantInputSchema: {
        partial: jest.fn().mockReturnValue({
            parse: jest.fn().mockImplementation((input) => input),
        }),
    },
    validationSchemas: {
        id: {},
        nonEmptyString: {},
    },
}));

jest.mock("../../../lib/shared/pagination", () => ({
    parsePagination: jest.fn(),
}));

jest.mock("../../../lib/shared/cache", () => ({
    withCache: jest.fn(),
    deleteCacheByPattern: jest.fn(),
    CACHE_TTL: {
        RESTAURANTS: 300,
    },
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput, validationSchemas } from "../../../lib/shared/validation";
import { parsePagination } from "../../../lib/shared/pagination";
import { withCache, deleteCacheByPattern } from "../../../lib/shared/cache";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;
const mockParsePagination = parsePagination as jest.Mock;
const mockWithCache = withCache as jest.Mock;
const mockDeleteCacheByPattern = deleteCacheByPattern as jest.Mock;

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

const buildManagerUser = () => ({
    id: "manager-123",
    email: "manager@example.com",
    role: UserRole.MANAGER,
    restaurantId: "restaurant-123",
    firstName: "Manager",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe("Restaurant Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        validationSchemas.id.parse = jest.fn().mockImplementation((id) => id);
        validationSchemas.nonEmptyString.parse = jest.fn().mockImplementation((str) => str);
        mockParsePagination.mockReturnValue({ first: 10, skip: 0 });
        mockWithCache.mockImplementation((key, fn) => fn());
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
        describe("restaurants", () => {
            it("should return restaurants for admin", async () => {
                const mockRestaurants = [
                    {
                        id: "rest-1",
                        name: "Test Restaurant",
                        location: "Downtown",
                        menu_items: [],
                    },
                ];

                (mockPrisma.restaurants.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.restaurants.findMany as jest.Mock).mockResolvedValue(mockRestaurants);

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Query?.restaurants?.(null, {}, context);

                expect(result).toEqual({
                    restaurants: mockRestaurants,
                    totalCount: 1,
                });
                expect(mockWithCache).toHaveBeenCalled();
            });

            it("should filter by assigned restaurant for manager", async () => {
                const mockRestaurants = [
                    {
                        id: "restaurant-123",
                        name: "Manager's Restaurant",
                        location: "Downtown",
                        menu_items: [],
                    },
                ];

                (mockPrisma.restaurants.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.restaurants.findMany as jest.Mock).mockResolvedValue(mockRestaurants);

                const context = createContext({ user: buildManagerUser() });
                await restaurantResolvers.Query?.restaurants?.(null, {}, context);

                expect(mockPrisma.restaurants.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { id: "restaurant-123" },
                    }),
                );
            });

            it("should throw unauthenticated error when not authenticated", async () => {
                const context = createContext();

                await expect(
                    restaurantResolvers.Query?.restaurants?.(null, {}, context),
                ).rejects.toThrow("Not authenticated");
            });
        });

        describe("restaurant", () => {
            it("should return restaurant for admin", async () => {
                const mockRestaurant = {
                    id: "rest-1",
                    name: "Test Restaurant",
                    location: "Downtown",
                    menu_items: [],
                };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Query?.restaurant?.(
                    null,
                    { id: "rest-1" },
                    context,
                );

                expect(result).toEqual(mockRestaurant);
                expect(mockWithCache).toHaveBeenCalledWith(
                    "restaurant:rest-1:ADMIN:unassigned",
                    expect.any(Function),
                    300,
                );
            });

            it("should return null for non-existent restaurant", async () => {
                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue(null);

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Query?.restaurant?.(
                    null,
                    { id: "rest-1" },
                    context,
                );

                expect(result).toBeNull();
            });

            it("should deny access for manager to other restaurant", async () => {
                const mockRestaurant = {
                    id: "other-rest",
                    name: "Other Restaurant",
                };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    restaurantResolvers.Query?.restaurant?.(null, { id: "other-rest" }, context),
                ).rejects.toThrow("Access denied to this restaurant");
            });
        });
    });

    describe("Mutation", () => {
        describe("createRestaurant", () => {
            const validInput = {
                name: "New Restaurant",
                description: "A great place to eat",
                address: "123 Main St",
                city: "New York",
                location: "Downtown",
                phone: "123-456-7890",
                email: "info@restaurant.com",
            };

            it("should create restaurant for admin", async () => {
                const mockCreatedRestaurant = {
                    id: "new-rest",
                    ...validInput,
                    isActive: true,
                    menu_items: [],
                };

                (mockPrisma.restaurants.create as jest.Mock).mockResolvedValue(
                    mockCreatedRestaurant,
                );

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Mutation?.createRestaurant?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedRestaurant);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("restaurants:*");
            });

            it("should deny creation for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    restaurantResolvers.Mutation?.createRestaurant?.(
                        null,
                        { input: validInput },
                        context,
                    ),
                ).rejects.toThrow("Admin access required to create restaurants");
            });
        });

        describe("updateRestaurant", () => {
            const updateInput = {
                name: "Updated Restaurant",
                isActive: false,
            };

            it("should update restaurant for admin", async () => {
                const mockRestaurant = {
                    id: "rest-1",
                    name: "Old Name",
                    isActive: true,
                    menu_items: [],
                };
                const updatedRestaurant = {
                    ...mockRestaurant,
                    ...updateInput,
                };

                (mockPrisma.restaurants.update as jest.Mock).mockResolvedValue(updatedRestaurant);

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Mutation?.updateRestaurant?.(
                    null,
                    { id: "rest-1", input: updateInput },
                    context,
                );

                expect(result).toEqual(updatedRestaurant);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("restaurant:rest-1:*");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("restaurants:*");
            });

            it("should deny update for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    restaurantResolvers.Mutation?.updateRestaurant?.(
                        null,
                        { id: "rest-1", input: updateInput },
                        context,
                    ),
                ).rejects.toThrow("Admin access required to update restaurants");
            });
        });

        describe("deleteRestaurant", () => {
            it("should delete restaurant for admin", async () => {
                const mockRestaurant = {
                    id: "rest-1",
                    name: "Test Restaurant",
                };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue(mockRestaurant);

                const context = createContext({ user: buildAdminUser() });
                const result = await restaurantResolvers.Mutation?.deleteRestaurant?.(
                    null,
                    { id: "rest-1" },
                    context,
                );

                expect(result).toBe(true);
                expect(mockPrisma.restaurants.delete).toHaveBeenCalledWith({
                    where: { id: "rest-1" },
                });
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("restaurant:rest-1:*");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("restaurants:*");
            });

            it("should deny deletion for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    restaurantResolvers.Mutation?.deleteRestaurant?.(
                        null,
                        { id: "rest-1" },
                        context,
                    ),
                ).rejects.toThrow("Admin access required to delete restaurants");
            });
        });
    });

    describe("Restaurant", () => {
        describe("menuItems", () => {
            it("should return menu_items from parent", () => {
                const parent = {
                    menu_items: [{ id: "item-1", name: "Burger" }],
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = restaurantResolvers.Restaurant?.menuItems?.(parent as any);

                expect(result).toEqual([{ id: "item-1", name: "Burger" }]);
            });

            it("should return empty array if no menu items", () => {
                const parent = {};

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = restaurantResolvers.Restaurant?.menuItems?.(parent as any);

                expect(result).toEqual([]);
            });
        });

        describe("menuCategories", () => {
            it("should return distinct categories from menu items", async () => {
                const mockCategories = [{ category: "Appetizers" }, { category: "Main Course" }];

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockCategories);

                const parent = { id: "rest-1" };

                const result = await restaurantResolvers.Restaurant?.menuCategories?.(
                    parent as unknown as restaurants,
                );

                expect(result).toEqual(["Appetizers", "Main Course"]);
                expect(mockPrisma.menu_items.findMany).toHaveBeenCalledWith({
                    where: { restaurantId: "rest-1" },
                    select: { category: true },
                    distinct: ["category"],
                });
            });
        });
    });
});
