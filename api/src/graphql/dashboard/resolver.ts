import type { GraphQLContext } from "../../types/graphql";
import { prisma } from "../../lib/database";
import { GraphQLErrors } from "../../lib/shared/errors";
import { validationSchemas } from "../../lib/shared/validation";
import { withCache, CACHE_TTL } from "../../lib/shared/cache";
import { Prisma, UserRole, OrderStatus, PaymentStatus } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 90;
const DEFAULT_PRESET: DashboardRangePreset = "LAST_7_DAYS";

type DashboardRangePreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "CUSTOM";

type DashboardRange = {
    preset: DashboardRangePreset;
    start: Date;
    end: Date;
    days: number;
};

type DashboardRangeInput = {
    preset?: DashboardRangePreset | null;
    start?: string | Date | null;
    end?: string | Date | null;
};

type OrderForDashboard = {
    id: string;
    restaurantId: string;
    totalAmount: Prisma.Decimal | number | null;
    status: OrderStatus;
    createdAt: Date;
    restaurants: {
        id: string;
        name: string;
        city: string | null;
        location: string | null;
    } | null;
    users: {
        firstName: string | null;
        lastName: string | null;
    } | null;
};

type MenuItemPerformanceRow = {
    menuItemId: string;
    quantity: number;
    price: number;
    menu_items: {
        id: string;
        name: string;
        category: string | null;
    } | null;
};

const startOfDayUTC = (date: Date): Date => {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
};

const endOfDayUTC = (date: Date): Date => {
    const copy = new Date(date);
    copy.setUTCHours(23, 59, 59, 999);
    return copy;
};

const parseDate = (value: string | Date | null | undefined): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
};

const presetToDays: Record<Exclude<DashboardRangePreset, "CUSTOM">, number> = {
    TODAY: 0,
    LAST_7_DAYS: 6,
    LAST_30_DAYS: 29,
    LAST_90_DAYS: 89,
};

const normalizeRange = (input?: DashboardRangeInput | null): DashboardRange => {
    const now = new Date();
    const hasCustomDates = Boolean(input?.start && input?.end);
    const preset = (hasCustomDates ? "CUSTOM" : input?.preset) ?? DEFAULT_PRESET;

    if (preset === "CUSTOM") {
        const startDate = startOfDayUTC(parseDate(input?.start) ?? new Date(NaN));
        const endDate = endOfDayUTC(parseDate(input?.end) ?? new Date(NaN));

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw GraphQLErrors.badInput("Invalid custom date range provided");
        }

        if (endDate < startDate) {
            throw GraphQLErrors.badInput("Range end must be after range start");
        }

        const days = Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw GraphQLErrors.badInput("Dashboard range cannot exceed 90 days");
        }

        return {
            preset,
            start: startDate,
            end: endDate,
            days,
        };
    }

    const offsetDays = presetToDays[preset];
    const end = endOfDayUTC(now);
    const start = startOfDayUTC(new Date(end.getTime() - offsetDays * MS_PER_DAY));

    return {
        preset,
        start,
        end,
        days: offsetDays + 1,
    };
};

const decimalToNumber = (value: Prisma.Decimal | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return Number((value as Prisma.Decimal).toString());
};

const buildRangeCacheKey = (prefix: string, range: DashboardRange, suffix = "global"): string => {
    return `dashboard:${prefix}:${range.start.toISOString()}:${range.end.toISOString()}:${suffix}`;
};

const requireUser = (context: GraphQLContext) => {
    if (!context.user) {
        throw GraphQLErrors.unauthenticated();
    }
    return context.user;
};

const ensureAdmin = (context: GraphQLContext) => {
    const user = requireUser(context);
    if (user.role !== UserRole.ADMIN) {
        throw GraphQLErrors.forbidden("Admin access required");
    }
    return user;
};

const ensureRestaurantAccess = (context: GraphQLContext, restaurantId: string) => {
    const user = requireUser(context);
    if (user.role === UserRole.ADMIN) {
        return user;
    }

    if (!user.restaurantId || user.restaurantId !== restaurantId) {
        throw GraphQLErrors.forbidden("You do not have access to this restaurant");
    }

    return user;
};

const buildOrderTrend = (orders: OrderForDashboard[]) => {
    const trendMap = new Map<string, { date: Date; orders: number; revenue: number }>();

    for (const order of orders) {
        const key = order.createdAt.toISOString().split("T")[0];
        const bucket = trendMap.get(key);
        if (bucket) {
            bucket.orders += 1;
            bucket.revenue += decimalToNumber(order.totalAmount);
        } else {
            trendMap.set(key, {
                date: new Date(`${key}T00:00:00.000Z`),
                orders: 1,
                revenue: decimalToNumber(order.totalAmount),
            });
        }
    }

    return Array.from(trendMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};

const buildTopRestaurants = (orders: OrderForDashboard[]) => {
    const map = new Map<
        string,
        {
            restaurantId: string;
            name: string;
            city: string | null;
            location: string | null;
            orders: number;
            revenue: number;
        }
    >();

    for (const order of orders) {
        const restaurantId = order.restaurantId;
        const restaurantMeta = order.restaurants;
        const bucket = map.get(restaurantId);
        const amount = decimalToNumber(order.totalAmount);

        if (bucket) {
            bucket.orders += 1;
            bucket.revenue += amount;
        } else {
            map.set(restaurantId, {
                restaurantId,
                name: restaurantMeta?.name ?? "Unknown Restaurant",
                city: restaurantMeta?.city ?? null,
                location: restaurantMeta?.location ?? null,
                orders: 1,
                revenue: amount,
            });
        }
    }

    return Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((entry) => ({
            ...entry,
            averageOrderValue: entry.orders > 0 ? entry.revenue / entry.orders : 0,
        }));
};

const buildRecentOrders = (orders: OrderForDashboard[]) => {
    return [...orders]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((order) => ({
            id: order.id,
            status: order.status,
            totalAmount: decimalToNumber(order.totalAmount),
            customerName:
                [order.users?.firstName, order.users?.lastName].filter(Boolean).join(" ") ||
                "Guest",
            createdAt: order.createdAt,
        }));
};

const buildMenuPerformance = (rows: MenuItemPerformanceRow[]) => {
    const map = new Map<
        string,
        {
            menuItemId: string;
            name: string;
            category: string | null;
            quantity: number;
            revenue: number;
            orders: number;
        }
    >();

    for (const row of rows) {
        const existing = map.get(row.menuItemId);
        const revenueContribution = Number(row.price ?? 0) * row.quantity;
        if (existing) {
            existing.quantity += row.quantity;
            existing.revenue += revenueContribution;
            existing.orders += 1;
        } else {
            map.set(row.menuItemId, {
                menuItemId: row.menuItemId,
                name: row.menu_items?.name ?? "Unknown Item",
                category: row.menu_items?.category ?? null,
                quantity: row.quantity,
                revenue: revenueContribution,
                orders: 1,
            });
        }
    }

    return Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
};

export const dashboardResolvers = {
    Query: {
        adminDashboardMetrics: async (
            _parent: unknown,
            args: { range?: DashboardRangeInput | null },
            context: GraphQLContext,
        ) => {
            ensureAdmin(context);
            const range = normalizeRange(args?.range);
            const cacheKey = buildRangeCacheKey("admin", range);

            return withCache(
                cacheKey,
                async () => {
                    const [
                        totalRestaurants,
                        activeRestaurants,
                        newRestaurants,
                        newUsers,
                        orders,
                        completedPayments,
                    ] = await Promise.all([
                        prisma.restaurants.count(),
                        prisma.restaurants.count({ where: { isActive: true } }),
                        prisma.restaurants.count({
                            where: {
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                            },
                        }),
                        prisma.users.count({
                            where: {
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                            },
                        }),
                        prisma.orders.findMany({
                            where: {
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                            },
                            select: {
                                id: true,
                                restaurantId: true,
                                totalAmount: true,
                                status: true,
                                createdAt: true,
                                restaurants: {
                                    select: {
                                        id: true,
                                        name: true,
                                        city: true,
                                        location: true,
                                    },
                                },
                                users: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        }),
                        prisma.payments.aggregate({
                            where: {
                                status: PaymentStatus.COMPLETED,
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                            },
                            _sum: { amount: true },
                            _count: { _all: true },
                        }),
                    ]);

                    // If payments aggregation returns zero (no recorded payments), fallback to sum of completed orders
                    const paymentsSum = decimalToNumber(completedPayments._sum.amount);
                    const orderRevenueSum = orders
                        .filter((o) => o.status === OrderStatus.COMPLETED)
                        .reduce((acc, cur) => acc + decimalToNumber(cur.totalAmount), 0);
                    const totalRevenue = paymentsSum || orderRevenueSum;
                    const completedOrdersList = orders.filter(
                        (o) => o.status === OrderStatus.COMPLETED,
                    );
                    const completedOrders = completedOrdersList.length;
                    const totalOrders = completedOrders; // Changed to only count completed orders
                    const averageOrderValue =
                        completedOrders > 0 ? totalRevenue / completedOrders : 0;

                    return {
                        range,
                        kpis: [
                            {
                                key: "totalRevenue",
                                label: "Total Revenue",
                                value: totalRevenue,
                                unit: "USD",
                            },
                            {
                                key: "totalOrders",
                                label: "Orders",
                                value: totalOrders,
                            },
                            {
                                key: "averageOrderValue",
                                label: "Avg. Order",
                                value: Number(averageOrderValue.toFixed(2)),
                                unit: "USD",
                            },
                            {
                                key: "totalRestaurants",
                                label: "Total Restaurants",
                                value: totalRestaurants,
                            },
                            {
                                key: "activeRestaurants",
                                label: "Active Restaurants",
                                value: activeRestaurants,
                            },
                            {
                                key: "newRestaurants",
                                label: "New Restaurants",
                                value: newRestaurants,
                            },
                            {
                                key: "newUsers",
                                label: "New Users",
                                value: newUsers,
                            },
                        ],
                        orderTrend: buildOrderTrend(completedOrdersList),
                        topRestaurants: buildTopRestaurants(completedOrdersList),
                    };
                },
                CACHE_TTL.DASHBOARD,
            );
        },
        restaurantDashboardMetrics: async (
            _parent: unknown,
            args: { restaurantId: string; range?: DashboardRangeInput | null },
            context: GraphQLContext,
        ) => {
            const validatedRestaurantId = validationSchemas.id.parse(args.restaurantId);
            ensureRestaurantAccess(context, validatedRestaurantId);
            const range = normalizeRange(args?.range);
            const cacheKey = buildRangeCacheKey("restaurant", range, validatedRestaurantId);

            return withCache(
                cacheKey,
                async () => {
                    const [orders, completedPayments, menuPerformanceRows] = await Promise.all([
                        prisma.orders.findMany({
                            where: {
                                restaurantId: validatedRestaurantId,
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                            },
                            select: {
                                id: true,
                                restaurantId: true,
                                totalAmount: true,
                                status: true,
                                createdAt: true,
                                restaurants: {
                                    select: {
                                        id: true,
                                        name: true,
                                        city: true,
                                        location: true,
                                    },
                                },
                                users: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        }),
                        prisma.payments.aggregate({
                            where: {
                                status: PaymentStatus.COMPLETED,
                                createdAt: {
                                    gte: range.start,
                                    lte: range.end,
                                },
                                orders: {
                                    restaurantId: validatedRestaurantId,
                                },
                            },
                            _sum: { amount: true },
                            _count: { _all: true },
                        }),
                        prisma.order_items.findMany({
                            where: {
                                orders: {
                                    restaurantId: validatedRestaurantId,
                                    createdAt: {
                                        gte: range.start,
                                        lte: range.end,
                                    },
                                },
                            },
                            select: {
                                menuItemId: true,
                                quantity: true,
                                price: true,
                                menu_items: {
                                    select: {
                                        id: true,
                                        name: true,
                                        category: true,
                                    },
                                },
                            },
                        }),
                    ]);

                    const paymentsSum = decimalToNumber(completedPayments._sum.amount);
                    const completedOrdersFromOrders = orders.filter(
                        (o) => o.status === OrderStatus.COMPLETED,
                    ).length;
                    const orderRevenueSum = orders
                        .filter((o) => o.status === OrderStatus.COMPLETED)
                        .reduce((acc, cur) => acc + decimalToNumber(cur.totalAmount), 0);

                    const totalRevenue = paymentsSum || orderRevenueSum;
                    const completedOrders =
                        (completedPayments._count && completedPayments._count._all) ||
                        completedOrdersFromOrders ||
                        0;
                    const averageOrderValue =
                        completedOrders > 0 ? totalRevenue / completedOrders : 0;
                    const pendingOrders = orders.filter(
                        (order) => order.status === OrderStatus.PENDING,
                    ).length;

                    const completedOrdersList = orders.filter(
                        (o) => o.status === OrderStatus.COMPLETED,
                    );

                    return {
                        range,
                        summary: {
                            totalRevenue,
                            totalOrders: completedOrders, // Total Orders shows completed orders
                            averageOrderValue: Number(averageOrderValue.toFixed(2)),
                            pendingOrders,
                            completedOrders, // Keep as completed orders count
                        },
                        orderTrend: buildOrderTrend(completedOrdersList),
                        topMenuItems: buildMenuPerformance(menuPerformanceRows),
                        recentOrders: buildRecentOrders(completedOrdersList),
                    };
                },
                CACHE_TTL.DASHBOARD,
            );
        },
    },
};
