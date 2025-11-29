import { dashboardResolvers } from "../resolver";
import { UserRole, OrderStatus, PaymentStatus } from "@prisma/client";

jest.mock("../../../lib/database", () => ({
    prisma: {
        restaurants: {
            count: jest.fn(),
        },
        users: {
            count: jest.fn(),
        },
        orders: {
            findMany: jest.fn(),
        },
        payments: {
            aggregate: jest.fn(),
            groupBy: jest.fn(),
        },
        feedbacks: {
            findMany: jest.fn(),
        },
        menu_items: {
            count: jest.fn(),
        },
        order_items: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock("../../../lib/shared/errors", () => ({
    GraphQLErrors: {
        unauthenticated: jest.fn((message = "Not authenticated") => new Error(message)),
        forbidden: jest.fn((message = "Access denied") => new Error(message)),
        badInput: jest.fn((message) => new Error(message)),
    },
}));

jest.mock("../../../lib/shared/cache", () => ({
    withCache: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
    CACHE_TTL: { DASHBOARD: 60 },
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { withCache } from "../../../lib/shared/cache";
import type { GraphQLContext } from "../../../types/graphql";
import { validationSchemas } from "../../../lib/shared/validation";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockWithCache = withCache as jest.Mock;

const buildUser = (overrides: Partial<GraphQLContext["user"]> = {}) => ({
    id: "user-1",
    email: "fake@foody.dev",
    firstName: "Test",
    lastName: "User",
    role: UserRole.ADMIN,
    restaurantId: null,
    isActive: true,
    password: "hashed",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const createContext = (overrides: Partial<GraphQLContext> = {}): GraphQLContext => ({
    prisma: mockPrisma as unknown as GraphQLContext["prisma"],
    user: null,
    ...overrides,
});

describe("Dashboard resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        validationSchemas.id.parse = jest.fn((id: string) => id);
        mockWithCache.mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn());
    });

    describe("adminDashboardMetrics", () => {
        it("throws when unauthenticated", async () => {
            const context = createContext();
            await expect(
                dashboardResolvers.Query?.adminDashboardMetrics?.(null, {}, context),
            ).rejects.toThrow("Not authenticated");
            expect(mockGraphQLErrors.unauthenticated).toHaveBeenCalled();
        });

        it("blocks non-admin users", async () => {
            const context = createContext({ user: buildUser({ role: UserRole.MANAGER }) });
            await expect(
                dashboardResolvers.Query?.adminDashboardMetrics?.(null, {}, context),
            ).rejects.toThrow("Admin access required");
            expect(mockGraphQLErrors.forbidden).toHaveBeenCalled();
        });

        it("returns aggregated metrics for admin", async () => {
            (mockPrisma.restaurants.count as jest.Mock)
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(8) // active
                .mockResolvedValueOnce(2); // new
            (mockPrisma.users.count as jest.Mock).mockResolvedValue(4);
            (mockPrisma.orders.findMany as jest.Mock).mockResolvedValue([
                {
                    id: "order-1",
                    restaurantId: "rest-1",
                    totalAmount: 120,
                    status: OrderStatus.COMPLETED,
                    createdAt: new Date("2024-01-01T00:00:00Z"),
                    restaurants: {
                        id: "rest-1",
                        name: "Foody A",
                        city: "NYC",
                        location: "Midtown",
                    },
                    users: {
                        firstName: "A",
                        lastName: "Customer",
                    },
                },
                {
                    id: "order-2",
                    restaurantId: "rest-2",
                    totalAmount: 80,
                    status: OrderStatus.PENDING,
                    createdAt: new Date("2024-01-02T00:00:00Z"),
                    restaurants: {
                        id: "rest-2",
                        name: "Foody B",
                        city: "SF",
                        location: "SOMA",
                    },
                    users: {
                        firstName: "B",
                        lastName: "Customer",
                    },
                },
            ]);
            (mockPrisma.payments.aggregate as jest.Mock).mockResolvedValue({
                _sum: { amount: 500 },
                _count: { _all: 5 },
            });

            const context = createContext({ user: buildUser({ role: UserRole.ADMIN }) });
            const result = await dashboardResolvers.Query?.adminDashboardMetrics?.(
                null,
                {},
                context,
            );

            expect(result).toBeDefined();
            expect(Array.isArray(result?.kpis)).toBe(true);
            expect(result?.kpis).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ key: "totalRevenue", value: 500 }),
                    expect.objectContaining({ key: "totalOrders", value: 1 }),
                    expect.objectContaining({ key: "totalRestaurants", value: 10 }),
                ]),
            );
            expect(result?.orderTrend).toHaveLength(1);
            expect(mockWithCache).toHaveBeenCalled();
        });
    });

    describe("restaurantDashboardMetrics", () => {
        it("enforces restaurant access", async () => {
            const context = createContext({
                user: buildUser({ role: UserRole.MEMBER, restaurantId: "rest-1" }),
            });

            await expect(
                dashboardResolvers.Query?.restaurantDashboardMetrics?.(
                    null,
                    { restaurantId: "rest-2" },
                    context,
                ),
            ).rejects.toThrow("You do not have access to this restaurant");
            expect(mockGraphQLErrors.forbidden).toHaveBeenCalled();
        });

        it("returns restaurant scoped metrics", async () => {
            (mockPrisma.orders.findMany as jest.Mock).mockResolvedValue([
                {
                    id: "order-1",
                    restaurantId: "rest-1",
                    totalAmount: 45,
                    status: OrderStatus.PENDING,
                    createdAt: new Date("2024-02-01T00:00:00Z"),
                    restaurants: null,
                    users: {
                        firstName: "Guest",
                        lastName: null,
                    },
                },
                {
                    id: "order-2",
                    restaurantId: "rest-1",
                    totalAmount: 60,
                    status: OrderStatus.COMPLETED,
                    createdAt: new Date("2024-02-02T00:00:00Z"),
                    restaurants: null,
                    users: {
                        firstName: "Jane",
                        lastName: "Doe",
                    },
                },
            ]);

            (mockPrisma.payments.aggregate as jest.Mock).mockResolvedValue({
                _sum: { amount: 200 },
                _count: { _all: 1 },
            });
            (mockPrisma.payments.groupBy as jest.Mock).mockResolvedValue([
                {
                    status: PaymentStatus.COMPLETED,
                    _count: { _all: 4 },
                    _sum: { amount: 200 },
                },
            ]);
            // menu_items.count not needed in simplified restaurant payload
            (mockPrisma.order_items.findMany as jest.Mock).mockResolvedValue([
                {
                    menuItemId: "menu-1",
                    quantity: 2,
                    price: 15,
                    menu_items: {
                        id: "menu-1",
                        name: "Burger",
                        category: "Main",
                    },
                },
                {
                    menuItemId: "menu-1",
                    quantity: 1,
                    price: 15,
                    menu_items: {
                        id: "menu-1",
                        name: "Burger",
                        category: "Main",
                    },
                },
            ]);

            const context = createContext({ user: buildUser({ restaurantId: "rest-1" }) });
            const result = await dashboardResolvers.Query?.restaurantDashboardMetrics?.(
                null,
                { restaurantId: "rest-1" },
                context,
            );

            expect(result).toBeDefined();
            expect(result?.summary.totalOrders).toBe(1);
            expect(result?.topMenuItems[0]).toMatchObject({ menuItemId: "menu-1", quantity: 3 });
            expect(mockWithCache).toHaveBeenCalled();
        });
    });
});
