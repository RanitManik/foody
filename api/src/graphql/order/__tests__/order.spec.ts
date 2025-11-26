import { orderResolvers } from "../resolver";
import { UserRole, OrderStatus } from "@prisma/client";

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        orders: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        menu_items: {
            findMany: jest.fn(),
        },
        payment_methods: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn(),
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
    CreateOrderInputSchema: {},
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
        ORDERS: 300,
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

describe("Order Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        validationSchemas.id.parse = jest.fn().mockImplementation((id) => id);
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
        describe("orders", () => {
            it("should return orders for admin", async () => {
                const mockOrders = [
                    {
                        id: "order-1",
                        userId: "user-1",
                        totalAmount: 25.99,
                        status: OrderStatus.PENDING,
                        users: { id: "user-1", firstName: "User", lastName: "One" },
                        order_items: [],
                        payments: [],
                    },
                ];

                (mockPrisma.orders.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.orders.findMany as jest.Mock).mockResolvedValue(mockOrders);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Query?.orders?.(null, {}, context);

                expect(result).toEqual({
                    orders: mockOrders,
                    totalCount: 1,
                });
                expect(mockWithCache).toHaveBeenCalled();
            });

            it("should filter orders by restaurant for manager", async () => {
                const mockOrders = [
                    {
                        id: "order-1",
                        userId: "user-1",
                        restaurantId: "restaurant-123",
                        totalAmount: 25.99,
                        status: OrderStatus.PENDING,
                        users: { id: "user-1", firstName: "User", lastName: "One" },
                        order_items: [],
                        payments: [],
                    },
                ];

                (mockPrisma.orders.count as jest.Mock).mockResolvedValue(1);
                (mockPrisma.orders.findMany as jest.Mock).mockResolvedValue(mockOrders);

                const context = createContext({ user: buildManagerUser() });
                await orderResolvers.Query?.orders?.(null, {}, context);

                expect(mockPrisma.orders.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { restaurantId: "restaurant-123" },
                    }),
                );
            });

            it("should throw unauthenticated error when not authenticated", async () => {
                const context = createContext();

                await expect(orderResolvers.Query?.orders?.(null, {}, context)).rejects.toThrow(
                    "Not authenticated",
                );
            });
        });

        describe("order", () => {
            it("should return order for admin", async () => {
                const mockOrder = {
                    id: "order-1",
                    userId: "user-1",
                    restaurantId: "rest-1",
                    status: OrderStatus.PENDING,
                    totalAmount: 25.99,
                    users: { id: "user-1", firstName: "User", lastName: "One" },
                    order_items: [],
                    payments: [],
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Query?.order?.(
                    null,
                    { id: "order-1" },
                    context,
                );

                expect(result).toEqual(mockOrder);
                expect(mockWithCache).toHaveBeenCalledWith(
                    "order:order-1:admin-123:unassigned",
                    expect.any(Function),
                    300,
                );
            });

            it("should return null for non-existent order", async () => {
                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(null);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Query?.order?.(
                    null,
                    { id: "order-1" },
                    context,
                );

                expect(result).toBeNull();
            });

            it("should deny access for manager to other restaurant's order", async () => {
                const mockOrder = {
                    id: "order-1",
                    restaurantId: "other-rest",
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    orderResolvers.Query?.order?.(null, { id: "order-1" }, context),
                ).rejects.toThrow("Access denied to this order");
            });
        });
    });

    describe("Mutation", () => {
        describe("createOrder", () => {
            const validInput = {
                items: [
                    { menuItemId: "item-1", quantity: 2, notes: "Extra spicy" },
                    { menuItemId: "item-2", quantity: 1 },
                ],
                phone: "123-456-7890",
                specialInstructions: "No onions",
            };

            it("should create order for admin", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        isAvailable: true,
                        restaurantId: "rest-1",
                        restaurants: { id: "rest-1", location: "NYC" },
                    },
                    {
                        id: "item-2",
                        name: "Fries",
                        price: 5.99,
                        isAvailable: true,
                        restaurantId: "rest-1",
                        restaurants: { id: "rest-1", location: "NYC" },
                    },
                ];
                const mockOrder = {
                    id: "order-1",
                    userId: "admin-123",
                    restaurantId: "rest-1",
                    totalAmount: 27.97,
                    status: OrderStatus.PENDING,
                    users: buildAdminUser(),
                    order_items: [],
                };

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
                (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
                    (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
                    return await fn(mockPrisma);
                });
                (mockPrisma.orders.create as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Mutation?.createOrder?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockOrder);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("orders:admin-123:*");
            });

            it("should create order for manager in assigned restaurant", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        isAvailable: true,
                        restaurantId: "restaurant-123",
                        restaurants: { id: "restaurant-123", location: "NYC" },
                    },
                ];
                const mockOrder = {
                    id: "order-1",
                    userId: "manager-123",
                    restaurantId: "restaurant-123",
                    totalAmount: 21.98,
                    status: OrderStatus.PENDING,
                    users: buildManagerUser(),
                    order_items: [],
                };

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
                (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
                    (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);
                    return await fn(mockPrisma);
                });
                (mockPrisma.orders.create as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildManagerUser() });
                const result = await orderResolvers.Mutation?.createOrder?.(
                    null,
                    { input: { ...validInput, items: [{ menuItemId: "item-1", quantity: 2 }] } },
                    context,
                );

                expect(result).toEqual(mockOrder);
            });

            it("should deny payment method attachment for members", async () => {
                const inputWithPayment = { ...validInput, paymentMethodId: "pm-1" };

                const context = createContext({ user: buildMemberUser() });

                await expect(
                    orderResolvers.Mutation?.createOrder?.(
                        null,
                        { input: inputWithPayment },
                        context,
                    ),
                ).rejects.toThrow("Only managers or admins can attach payment methods");
            });

            it("should throw error for unavailable menu item", async () => {
                const mockMenuItems = [
                    {
                        id: "item-1",
                        name: "Burger",
                        price: 10.99,
                        isAvailable: false, // Unavailable
                        restaurantId: "rest-1",
                        restaurants: { id: "rest-1", location: "NYC" },
                    },
                ];

                (mockPrisma.menu_items.findMany as jest.Mock).mockResolvedValue(mockMenuItems);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    orderResolvers.Mutation?.createOrder?.(
                        null,
                        {
                            input: {
                                ...validInput,
                                items: [{ menuItemId: "item-1", quantity: 1 }],
                            },
                        },
                        context,
                    ),
                ).rejects.toThrow("Menu item item-1 is not available");
            });
        });

        describe("updateOrderStatus", () => {
            it("should update order status for admin", async () => {
                const mockOrder = {
                    id: "order-1",
                    userId: "user-1",
                    restaurantId: "rest-1",
                    status: OrderStatus.PENDING,
                    users: { id: "user-1", restaurantId: "rest-1" },
                    order_items: [],
                };
                const updatedOrder = { ...mockOrder, status: OrderStatus.COMPLETED };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);
                (mockPrisma.orders.update as jest.Mock).mockResolvedValue(updatedOrder);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Mutation?.updateOrderStatus?.(
                    null,
                    { id: "order-1", status: OrderStatus.COMPLETED },
                    context,
                );

                expect(result).toEqual(updatedOrder);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("order:order-1:*");
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("orders:user-1:*");
            });

            it("should deny status update for members", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    orderResolvers.Mutation?.updateOrderStatus?.(
                        null,
                        { id: "order-1", status: OrderStatus.COMPLETED },
                        context,
                    ),
                ).rejects.toThrow("Members cannot update order status");
            });

            it("should deny status update for manager on other restaurant's order", async () => {
                const mockOrder = {
                    id: "order-1",
                    restaurantId: "other-rest",
                    users: { id: "user-1", restaurantId: "other-rest" },
                    order_items: [],
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    orderResolvers.Mutation?.updateOrderStatus?.(
                        null,
                        { id: "order-1", status: OrderStatus.COMPLETED },
                        context,
                    ),
                ).rejects.toThrow("Managers can only update orders for their assigned restaurant");
            });
        });

        describe("cancelOrder", () => {
            it("should cancel pending order for admin", async () => {
                const mockOrder = {
                    id: "order-1",
                    userId: "user-1",
                    restaurantId: "rest-1",
                    status: OrderStatus.PENDING,
                    users: { id: "user-1", restaurantId: "rest-1" },
                    order_items: [],
                };
                const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);
                (mockPrisma.orders.update as jest.Mock).mockResolvedValue(cancelledOrder);

                const context = createContext({ user: buildAdminUser() });
                const result = await orderResolvers.Mutation?.cancelOrder?.(
                    null,
                    { id: "order-1" },
                    context,
                );

                expect(result).toEqual(cancelledOrder);
                expect(mockPrisma.orders.update).toHaveBeenCalledWith({
                    where: { id: "order-1" },
                    data: { status: OrderStatus.CANCELLED },
                    include: expect.any(Object),
                });
            });

            it("should deny cancellation for non-pending orders", async () => {
                const mockOrder = {
                    id: "order-1",
                    status: OrderStatus.COMPLETED, // Not pending
                    users: { id: "user-1", restaurantId: "rest-1" },
                    order_items: [],
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    orderResolvers.Mutation?.cancelOrder?.(null, { id: "order-1" }, context),
                ).rejects.toThrow("Only pending orders can be cancelled");
            });

            it("should deny cancellation for members", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    orderResolvers.Mutation?.cancelOrder?.(null, { id: "order-1" }, context),
                ).rejects.toThrow("Members cannot cancel orders");
            });
        });
    });

    describe("Order", () => {
        describe("items", () => {
            it("should return order_items from parent", () => {
                const parent = {
                    order_items: [{ id: "item-1", quantity: 2 }],
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.Order?.items?.(parent as any);

                expect(result).toEqual([{ id: "item-1", quantity: 2 }]);
            });
        });

        describe("payment", () => {
            it("should return first payment from parent", () => {
                const parent = {
                    payments: [{ id: "pay-1", amount: 25.99 }],
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.Order?.payment?.(parent as any);

                expect(result).toEqual({ id: "pay-1", amount: 25.99 });
            });

            it("should return null if no payments", () => {
                const parent = {
                    payments: [],
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.Order?.payment?.(parent as any);

                expect(result).toBeNull();
            });
        });

        describe("user", () => {
            it("should return users from parent", () => {
                const parent = {
                    users: { id: "user-1", firstName: "User" },
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.Order?.user?.(parent as any);

                expect(result).toEqual({ id: "user-1", firstName: "User" });
            });
        });
    });

    describe("OrderItem", () => {
        describe("menuItem", () => {
            it("should return menu_items from parent", () => {
                const parent = {
                    menu_items: { id: "item-1", name: "Burger" },
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.OrderItem?.menuItem?.(parent as any);

                expect(result).toEqual({ id: "item-1", name: "Burger" });
            });
        });

        describe("order", () => {
            it("should return orders from parent", () => {
                const parent = {
                    orders: { id: "order-1", status: OrderStatus.PENDING },
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = orderResolvers.OrderItem?.order?.(parent as any);

                expect(result).toEqual({ id: "order-1", status: OrderStatus.PENDING });
            });
        });
    });
});
