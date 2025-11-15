import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validateInput,
    CreateOrderInputSchema,
    validationSchemas,
} from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext, CreateOrderInput } from "../../types/graphql";
import {
    UserRole,
    OrderStatus,
    orders,
    order_items,
    payments,
    users,
    menu_items,
} from "@prisma/client";
import { withCache, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

export const orderResolvers = {
    Query: {
        orders: async (
            _parent: unknown,
            { first, skip }: { first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const pagination = parsePagination({ first, skip });
            const whereClause: Record<string, unknown> = {};

            // Non-admin users can only see their own orders
            if (context.user.role !== UserRole.ADMIN) {
                whereClause.userId = context.user.id;

                // Managers can see orders from their country
                if (
                    context.user.role === UserRole.MANAGER_INDIA ||
                    context.user.role === UserRole.MANAGER_AMERICA
                ) {
                    // Get orders from users in the same country
                    const countryUsers = await prisma.users.findMany({
                        where: {
                            role:
                                context.user.role === UserRole.MANAGER_INDIA
                                    ? { in: [UserRole.MEMBER_INDIA] }
                                    : { in: [UserRole.MEMBER_AMERICA] },
                        },
                        select: { id: true },
                    });
                    whereClause.userId = {
                        in: [...countryUsers.map((u: { id: string }) => u.id), context.user.id],
                    };
                }
            }

            // Use Redis caching for orders queries (user-specific)
            const cacheKey = `orders:${context.user.id}:${pagination.first}:${pagination.skip}`;
            return await withCache(
                cacheKey,
                async () => {
                    return await prisma.orders.findMany({
                        where: whereClause,
                        select: {
                            id: true,
                            userId: true,
                            totalAmount: true,
                            status: true,
                            deliveryAddress: true,
                            phone: true,
                            specialInstructions: true,
                            createdAt: true,
                            updatedAt: true,
                            users: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                            order_items: {
                                select: {
                                    id: true,
                                    quantity: true,
                                    price: true,
                                    notes: true,
                                    menu_items: {
                                        select: {
                                            id: true,
                                            name: true,
                                            price: true,
                                            category: true,
                                        },
                                    },
                                },
                            },
                            payments: {
                                select: {
                                    id: true,
                                    amount: true,
                                    status: true,
                                    createdAt: true,
                                    payment_methods: {
                                        select: {
                                            type: true,
                                            provider: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        take: pagination.first,
                        skip: pagination.skip,
                    });
                },
                CACHE_TTL.ORDERS,
            );
        },

        order: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Use Redis caching for individual orders with user-specific keys
            const cacheKey = `order:${validatedId}:${context.user.id}`;
            const order = await withCache(
                cacheKey,
                async () => {
                    return await prisma.orders.findUnique({
                        where: { id: validatedId },
                        select: {
                            id: true,
                            userId: true,
                            status: true,
                            totalAmount: true,
                            createdAt: true,
                            updatedAt: true,
                            users: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                },
                            },
                            order_items: {
                                select: {
                                    id: true,
                                    quantity: true,
                                    price: true,
                                    notes: true,
                                    menu_items: {
                                        select: {
                                            id: true,
                                            name: true,
                                            description: true,
                                            price: true,
                                            category: true,
                                            imageUrl: true,
                                            restaurantId: true,
                                        },
                                    },
                                },
                            },
                            payments: {
                                select: {
                                    id: true,
                                    amount: true,
                                    status: true,
                                    paymentMethodId: true,
                                    createdAt: true,
                                    payment_methods: {
                                        select: {
                                            id: true,
                                            type: true,
                                            last4: true,
                                            isDefault: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                },
                CACHE_TTL.ORDERS,
            );

            if (!order) return null;

            // Check access permissions
            if (context.user.role !== UserRole.ADMIN && order.userId !== context.user.id) {
                // Managers can access orders from their country members
                if (
                    context.user.role === UserRole.MANAGER_INDIA ||
                    context.user.role === UserRole.MANAGER_AMERICA
                ) {
                    const orderUser = await prisma.users.findUnique({
                        where: { id: order.userId },
                        select: { role: true },
                    });

                    const isSameCountry =
                        (context.user.role === UserRole.MANAGER_INDIA &&
                            orderUser?.role === UserRole.MEMBER_INDIA) ||
                        (context.user.role === UserRole.MANAGER_AMERICA &&
                            orderUser?.role === UserRole.MEMBER_AMERICA);

                    if (!isSameCountry) {
                        throw GraphQLErrors.forbidden("Access denied to this order");
                    }
                } else {
                    throw GraphQLErrors.forbidden("Access denied to this order");
                }
            }

            return order;
        },
    },

    Mutation: {
        createOrder: async (
            _parent: unknown,
            { input }: { input: CreateOrderInput },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Order creation failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                // Validate input
                const validated = validateInput(CreateOrderInputSchema, input);
                const { items, deliveryAddress, phone, specialInstructions, paymentMethodId } =
                    validated;

                // Validate payment method belongs to user
                const paymentMethod = await prisma.payment_methods.findFirst({
                    where: {
                        id: paymentMethodId,
                        userId: context.user.id,
                    },
                });

                if (!paymentMethod) {
                    logger.warn("Order creation failed: invalid payment method", {
                        userId: context.user.id,
                        paymentMethodId,
                    });
                    throw GraphQLErrors.badInput("Invalid payment method");
                }

                // Fetch all menu items in a single query to avoid N+1 problem
                const menuItemIds = items.map((item) => item.menuItemId);
                const menuItems = await prisma.menu_items.findMany({
                    where: {
                        id: { in: menuItemIds },
                    },
                    include: { restaurants: true },
                });

                // Create a map for quick lookup
                const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

                // Validate all menu items and calculate total
                let totalAmount = 0;
                const orderItems: Array<{
                    menuItemId: string;
                    quantity: number;
                    price: number;
                    notes?: string | null;
                }> = [];

                for (const item of items) {
                    const menuItem = menuItemMap.get(item.menuItemId);

                    if (!menuItem) {
                        logger.warn("Order creation failed: menu item not found", {
                            userId: context.user.id,
                            menuItemId: item.menuItemId,
                        });
                        throw GraphQLErrors.badInput(`Menu item ${item.menuItemId} not found`);
                    }

                    if (!menuItem.isAvailable) {
                        logger.warn("Order creation failed: menu item unavailable", {
                            userId: context.user.id,
                            menuItemId: item.menuItemId,
                        });
                        throw GraphQLErrors.badInput(
                            `Menu item ${item.menuItemId} is not available`,
                        );
                    }

                    // Check country access
                    if (context.user.role !== UserRole.ADMIN) {
                        if (
                            context.user.role === UserRole.MANAGER_INDIA ||
                            context.user.role === UserRole.MEMBER_INDIA
                        ) {
                            if (menuItem.restaurants.country !== "INDIA") {
                                logger.warn("Order creation failed: country access denied", {
                                    userId: context.user.id,
                                    userRole: context.user.role,
                                    restaurantCountry: menuItem.restaurants.country,
                                });
                                throw GraphQLErrors.forbidden("Cannot order from this restaurant");
                            }
                        } else if (
                            context.user.role === UserRole.MANAGER_AMERICA ||
                            context.user.role === UserRole.MEMBER_AMERICA
                        ) {
                            if (menuItem.restaurants.country !== "AMERICA") {
                                logger.warn("Order creation failed: country access denied", {
                                    userId: context.user.id,
                                    userRole: context.user.role,
                                    restaurantCountry: menuItem.restaurants.country,
                                });
                                throw GraphQLErrors.forbidden("Cannot order from this restaurant");
                            }
                        }
                    }

                    const itemTotal = menuItem.price * item.quantity;
                    totalAmount += itemTotal;

                    orderItems.push({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        price: menuItem.price,
                        notes: item.notes,
                    });
                }

                // Create order within a transaction for atomicity
                const order = await prisma.$transaction(async (tx) => {
                    // Verify menu items are still available (prevent race conditions)
                    const currentMenuItems = await tx.menu_items.findMany({
                        where: {
                            id: { in: menuItemIds },
                            isAvailable: true,
                        },
                    });

                    if (currentMenuItems.length !== menuItemIds.length) {
                        throw GraphQLErrors.badInput(
                            "One or more menu items are no longer available",
                        );
                    }

                    // Create order (context.user is guaranteed to exist due to check at function start)
                    if (!context.user) {
                        throw GraphQLErrors.unauthenticated();
                    }

                    return await tx.orders.create({
                        data: {
                            userId: context.user.id,
                            totalAmount,
                            deliveryAddress,
                            phone,
                            specialInstructions,
                            order_items: {
                                create: orderItems,
                            },
                        },
                        include: {
                            users: true,
                            order_items: {
                                include: {
                                    menu_items: true,
                                },
                            },
                        },
                    });
                });

                logger.info("Order created successfully", {
                    orderId: order.id,
                    userId: context.user.id,
                    totalAmount: order.totalAmount,
                    itemCount: orderItems.length,
                });

                // Invalidate order caches for the user
                await deleteCacheByPattern(`orders:${context.user.id}:*`);

                return order;
            } catch (error) {
                logger.error("Order creation failed", {
                    userId: context.user?.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        updateOrderStatus: async (
            _parent: unknown,
            { id, status }: { id: string; status: OrderStatus },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Check permissions
            if (
                context.user.role === UserRole.MEMBER_INDIA ||
                context.user.role === UserRole.MEMBER_AMERICA
            ) {
                throw GraphQLErrors.forbidden("Members cannot update order status");
            }

            const order = await prisma.orders.findUnique({
                where: { id: validatedId },
                include: { users: true },
            });

            if (!order) {
                throw GraphQLErrors.notFound("Order not found");
            }

            // Check if manager can access this order
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA &&
                    order.users.role !== UserRole.MEMBER_INDIA
                ) {
                    throw GraphQLErrors.forbidden();
                }
                if (
                    context.user.role === UserRole.MANAGER_AMERICA &&
                    order.users.role !== UserRole.MEMBER_AMERICA
                ) {
                    throw GraphQLErrors.forbidden();
                }
            }

            return await prisma.orders
                .update({
                    where: { id: validatedId },
                    data: { status },
                    include: {
                        users: true,
                        order_items: {
                            include: {
                                menu_items: true,
                            },
                        },
                        payments: {
                            include: {
                                payment_methods: true,
                            },
                        },
                    },
                })
                .then(async (updatedOrder) => {
                    // Invalidate cache for the specific order (all user variants) and orders list
                    await Promise.all([
                        deleteCacheByPattern(`order:${validatedId}:*`),
                        deleteCacheByPattern(`orders:${updatedOrder.userId}:*`),
                    ]);
                    return updatedOrder;
                });
        },

        cancelOrder: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Check permissions - members cannot cancel orders
            if (
                context.user.role === UserRole.MEMBER_INDIA ||
                context.user.role === UserRole.MEMBER_AMERICA
            ) {
                throw GraphQLErrors.forbidden("Members cannot cancel orders");
            }

            const order = await prisma.orders.findUnique({
                where: { id: validatedId },
                include: { users: true },
            });

            if (!order) {
                throw GraphQLErrors.notFound("Order not found");
            }

            // Check if manager can access this order
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA &&
                    order.users.role !== UserRole.MEMBER_INDIA
                ) {
                    throw GraphQLErrors.forbidden();
                }
                if (
                    context.user.role === UserRole.MANAGER_AMERICA &&
                    order.users.role !== UserRole.MEMBER_AMERICA
                ) {
                    throw GraphQLErrors.forbidden();
                }
            }

            return await prisma.orders
                .update({
                    where: { id: validatedId },
                    data: { status: OrderStatus.CANCELLED },
                    include: {
                        users: true,
                        order_items: {
                            include: {
                                menu_items: true,
                            },
                        },
                        payments: {
                            include: {
                                payment_methods: true,
                            },
                        },
                    },
                })
                .then(async (cancelledOrder) => {
                    // Invalidate cache for the specific order (all user variants) and orders list
                    await Promise.all([
                        deleteCacheByPattern(`order:${validatedId}:*`),
                        deleteCacheByPattern(`orders:${cancelledOrder.userId}:*`),
                    ]);
                    return cancelledOrder;
                });
        },
    },

    Order: {
        items: (parent: orders & { order_items: order_items[] }) => parent.order_items,
        payment: (parent: orders & { payments: payments[] }) => parent.payments?.[0] || null,
        user: (parent: orders & { users: users }) => parent.users,
    },

    OrderItem: {
        menuItem: (parent: order_items & { menu_items: menu_items }) => parent.menu_items,
        order: (parent: order_items & { orders: orders }) => parent.orders,
    },
};
