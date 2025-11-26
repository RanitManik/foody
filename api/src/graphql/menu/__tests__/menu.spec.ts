import { menuResolvers } from "../resolver";
import { UserRole } from "@prisma/client";

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        menu_items: {
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
        order_items: {
            count: jest.fn(),
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
    CreateMenuItemInputSchema: {
        partial: jest.fn().mockReturnValue({
            parse: jest.fn().mockImplementation((input) => input),
        }),
    },
    validationSchemas: {
        id: {},
    },
}));

jest.mock("../../../lib/shared/pagination", () => ({
    parsePagination: jest.fn(),
}));

jest.mock("../../../lib/shared/cache", () => ({
    withCache: jest.fn(),
    createCacheKey: {
        menuItem: jest.fn(),
    },
    deleteCacheByPattern: jest.fn(),
    CACHE_TTL: {
        MENU_ITEMS: 300,
    },
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput, validationSchemas } from "../../../lib/shared/validation";
import { parsePagination } from "../../../lib/shared/pagination";
import { withCache, createCacheKey, deleteCacheByPattern } from "../../../lib/shared/cache";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;
const mockParsePagination = parsePagination as jest.Mock;
const mockWithCache = withCache as jest.Mock;
const mockCreateCacheKey = createCacheKey as jest.Mocked<typeof createCacheKey>;
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

const buildMemberUser = () => ({
    id: "member-123",
    email: "member@example.com",
    role: UserRole.MEMBER,
    restaurantId: "restaurant-123",
    firstName: "Member",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe("Menu Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        validationSchemas.id.parse = jest.fn().mockImplementation((id) => id);
        mockParsePagination.mockReturnValue({ first: 10, skip: 0 });
        mockWithCache.mockImplementation((key, fn) => fn());
        mockCreateCacheKey.menuItem.mockImplementation((id) => `menuItem:${id}`);
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
        describe("menuItems", () => {
            it("should return menu items for admin user", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        category: "Main Course",
                        isAvailable: true,
                        restaurantId: "rest-1",
                        restaurants: { id: "rest-1", name: "Test Restaurant" },
                    },
                ];

                (mockPrisma.menu_items.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Query?.menuItems?.(null, {}, context);

                expect(result).toEqual({
                    menuItems: mockMenuItems,
                    totalCount: 1,
                });
                expect(mockWithCache).toHaveBeenCalled();
            });

            it("should filter by restaurant for manager", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        category: "Main Course",
                        isAvailable: true,
                        restaurantId: "restaurant-123",
                        restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                    },
                ];

                (mockPrisma.menu_items.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

                const context = createContext({ user: buildManagerUser() });
                const result = await menuResolvers.Query?.menuItems?.(null, {}, context);

                expect(mockPrisma.menu_items.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { restaurantId: "restaurant-123" },
                    }),
                );
                expect(result).toEqual({
                    menuItems: mockMenuItems,
                    totalCount: 1,
                });
            });

            it("should throw unauthenticated error when not authenticated", async () => {
                const context = createContext();

                await expect(menuResolvers.Query?.menuItems?.(null, {}, context)).rejects.toThrow(
                    "Not authenticated",
                );
            });

            it("should filter unavailable items for members", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        category: "Main Course",
                        isAvailable: true,
                        restaurantId: "restaurant-123",
                        restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                    },
                ];

                (mockPrisma.menu_items.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

                const context = createContext({ user: buildMemberUser() });
                await menuResolvers.Query?.menuItems?.(null, {}, context);

                expect(mockPrisma.menu_items.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { restaurantId: "restaurant-123", isAvailable: true },
                    }),
                );
            });
        });

        describe("menuItem", () => {
            it("should return menu item for admin", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    name: "Burger",
                    price: 10.99,
                    category: "Main Course",
                    isAvailable: true,
                    restaurantId: "rest-1",
                    restaurants: { id: "rest-1", name: "Test Restaurant" },
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Query?.menuItem?.(
                    null,
                    { id: "item-1" },
                    context,
                );

                expect(result).toEqual(mockMenuItem);
                expect(mockWithCache).toHaveBeenCalledWith(
                    "menuItem:item-1",
                    expect.any(Function),
                    300,
                );
            });

            it("should throw not found for non-existent item", async () => {
                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(null);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    menuResolvers.Query?.menuItem?.(null, { id: "item-1" }, context),
                ).rejects.toThrow("Menu item not found");
            });

            it("should deny access for manager to other restaurant's item", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    restaurantId: "other-rest",
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    menuResolvers.Query?.menuItem?.(null, { id: "item-1" }, context),
                ).rejects.toThrow("Access denied to this menu item");
            });
        });

        describe("menuCategories", () => {
            it("should return categories for admin", async () => {
                const mockCategories = [{ category: "Appetizers" }, { category: "Main Course" }];

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockCategories);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Query?.menuCategories?.(null, {}, context);

                expect(result).toEqual(["Appetizers", "Main Course"]);
            });

            it("should filter categories by restaurant for manager", async () => {
                const mockCategories = [{ category: "Main Course" }];

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockCategories);

                const context = createContext({ user: buildManagerUser() });
                await menuResolvers.Query?.menuCategories?.(null, {}, context);

                expect(mockPrisma.menu_items.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { restaurantId: "restaurant-123" },
                    }),
                );
            });
        });
    });

    describe("Mutation", () => {
        describe("createMenuItem", () => {
            const validInput = {
                name: "New Burger",
                description: "Delicious burger",
                price: 12.99,
                category: "Main Course",
                restaurantId: "restaurant-123",
                imageUrl: "http://example.com/image.jpg",
                isAvailable: true,
            };

            it("should create menu item for admin", async () => {
                const mockCreatedItem = {
                    id: "new-item",
                    ...validInput,
                    restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue({
                    id: "restaurant-123",
                    name: "Test Restaurant",
                });
                (mockPrisma.menu_items.create as jest.Mock).mockResolvedValue(mockCreatedItem);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Mutation?.createMenuItem?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedItem);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("menuItems:*");
            });

            it("should create menu item for manager in assigned restaurant", async () => {
                const mockCreatedItem = {
                    id: "new-item",
                    ...validInput,
                    restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue({
                    id: "restaurant-123",
                    name: "Test Restaurant",
                });
                (mockPrisma.menu_items.create as jest.Mock).mockResolvedValue(mockCreatedItem);

                const context = createContext({ user: buildManagerUser() });
                const result = await menuResolvers.Mutation?.createMenuItem?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedItem);
            });

            it("should deny creation for member", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    menuResolvers.Mutation?.createMenuItem?.(null, { input: validInput }, context),
                ).rejects.toThrow("Not authorized to create menu items");
            });

            it("should deny creation for manager in different restaurant", async () => {
                const input = { ...validInput, restaurantId: "other-rest" };

                (mockPrisma.restaurants.findUnique as jest.Mock).mockResolvedValue({
                    id: "other-rest",
                    name: "Other Restaurant",
                });

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    menuResolvers.Mutation?.createMenuItem?.(null, { input }, context),
                ).rejects.toThrow("Cannot manage menu items outside assigned restaurant");
            });
        });

        describe("updateMenuItem", () => {
            const updateInput = {
                name: "Updated Burger",
                price: 14.99,
            };

            it("should update menu item for admin", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    restaurantId: "restaurant-123",
                    restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                };
                const mockUpdatedItem = {
                    ...mockMenuItem,
                    ...updateInput,
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);
                (mockPrisma.menu_items.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Mutation?.updateMenuItem?.(
                    null,
                    { id: "item-1", input: updateInput },
                    context,
                );

                expect(result).toEqual(mockUpdatedItem);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("menuItem:item-1");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("menuItems:*");
            });

            it("should deny update for manager on other restaurant's item", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    restaurantId: "other-rest",
                    restaurants: { id: "other-rest", name: "Other Restaurant" },
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    menuResolvers.Mutation?.updateMenuItem?.(
                        null,
                        { id: "item-1", input: updateInput },
                        context,
                    ),
                ).rejects.toThrow("Cannot manage menu items outside assigned restaurant");
            });
        });

        describe("deleteMenuItem", () => {
            it("should delete menu item for admin", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    restaurantId: "restaurant-123",
                    restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);
                (mockPrisma.order_items.count as jest.Mock).mockResolvedValue(0);

                const context = createContext({ user: buildAdminUser() });
                const result = await menuResolvers.Mutation?.deleteMenuItem?.(
                    null,
                    { id: "item-1" },
                    context,
                );

                expect(result).toBe(true);
                expect(mockPrisma.menu_items.delete).toHaveBeenCalledWith({
                    where: { id: "item-1" },
                });
            });

            it("should deny deletion for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    menuResolvers.Mutation?.deleteMenuItem?.(null, { id: "item-1" }, context),
                ).rejects.toThrow("Not authorized to delete menu items");
            });

            it("should prevent deletion if item is in orders", async () => {
                const mockMenuItem = {
                    id: "item-1",
                    restaurantId: "restaurant-123",
                    restaurants: { id: "restaurant-123", name: "Test Restaurant" },
                };

                (mockPrisma.menu_items.findUnique as jest.Mock).mockResolvedValue(mockMenuItem);
                (mockPrisma.order_items.count as jest.Mock).mockResolvedValue(1);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    menuResolvers.Mutation?.deleteMenuItem?.(null, { id: "item-1" }, context),
                ).rejects.toThrow(
                    "Cannot delete menu item that is part of existing orders. Please cancel or complete all orders containing this item first.",
                );
            });
        });
    });

    describe("MenuItem", () => {
        describe("restaurant", () => {
            it("should return restaurant from parent", () => {
                const parent = {
                    restaurants: { id: "rest-1", name: "Test Restaurant" },
                };

                const result = menuResolvers.MenuItem?.restaurant?.(parent);

                expect(result).toEqual({ id: "rest-1", name: "Test Restaurant" });
            });

            it("should return null if no restaurant", () => {
                const parent = {};

                const result = menuResolvers.MenuItem?.restaurant?.(parent);

                expect(result).toBeNull();
            });
        });
    });
});
