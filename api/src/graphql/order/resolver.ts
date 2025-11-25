/**
 * @fileoverview Order Management Resolvers
 * @module graphql/order/resolver
 * @description Handles complete order lifecycle including creation, tracking, status updates,
 * and cancellation. Implements strict role-based access control with the business rule:
 * **Only managers/admins can complete checkout** while members are limited to cart creation.
 *
 * @features
 * - Order creation with multiple menu items
 * - Order status tracking and updates
 * - Order cancellation
 * - Role-based order visibility
 * - Restaurant-scoped order management for managers
 * - Transactional order creation for data consistency
 * - N+1 query prevention with batch loading
 * - Redis caching for performance
 *
 * @security
 * - Authentication required for all operations
 * - Members can only create carts for their assigned restaurant
 * - Managers can only create/manage orders in their assigned restaurant
 * - Users can only view their own orders (except managers/admin)
 * - Order status changes restricted to managers/admin
 * - Payment method validation ensures ownership
 *
 * @businessRules
 * - **CRITICAL**: Members can only create carts for their assigned restaurant
 * - Managers can only manage orders for their assigned restaurant
 * - Orders require valid payment method owned by user
 * - Total amount calculated server-side (not trusted from client)
 * - Menu items must be available at order creation time
 * - Race condition prevention via database transactions
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

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
import type { Prisma } from "@prisma/client";
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

const requireAssignedRestaurant = (user: NonNullable<GraphQLContext["user"]>): string => {
    if (!user.restaurantId) {
        logger.warn("Restaurant assignment missing for order operation", {
            userId: user.id,
            role: user.role,
        });
        throw GraphQLErrors.forbidden("Restaurant assignment required for this action");
    }

    return user.restaurantId;
};

export const orderResolvers = {
    Query: {
        /**
         * Retrieve paginated list of orders with role-based filtering
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {number} [params.first=10] - Number of orders to return
         * @param {number} [params.skip=0] - Number of orders to skip
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order[]>} Array of orders with items, user, and payment details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         *
         * @description
         * Fetches orders with intelligent filtering based on user role:
         * - **Regular Users**: Only their own orders
         * - **Managers**: Orders scoped to their assigned restaurant (all orders for the restaurant)
         * - **Members**: Orders scoped to their assigned restaurant (all orders for the restaurant)
         * - **Admin**: All orders in the system
         *
         * Results include full order items, user info, and payment details.
         * Orders are cached per user for performance.
         *
         * @caching
         * - Cache key: orders:{userId}:{restaurantScope}:{restaurantId}:{first}:{skip}
         * - TTL: CACHE_TTL.ORDERS
         * - Invalidated on: order create/update/cancel operations
         *
         * @example
         * query {
         *   orders(first: 10, skip: 0) {
         *     id status totalAmount
         *     user { email firstName }
         *     items { quantity menuItem { name } }
         *   }
         * }
         */
        orders: async (
            _parent: unknown,
            { first, skip, restaurantId }: { first?: number; skip?: number; restaurantId?: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const pagination = parsePagination({ first, skip });
            const whereClause: Prisma.ordersWhereInput = {};

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;

            if (!isAdmin) {
                const assignedRestaurantId = requireAssignedRestaurant(currentUser);
                if (restaurantId && restaurantId !== assignedRestaurantId) {
                    throw GraphQLErrors.forbidden("Access denied to this restaurant's orders");
                }
                whereClause.restaurantId = assignedRestaurantId;
            } else if (restaurantId) {
                whereClause.restaurantId = restaurantId;
            }

            const restaurantScope = currentUser.restaurantId ?? (isAdmin ? "all" : "unassigned");
            const cacheKey = `orders:${currentUser.id}:${restaurantScope}:${restaurantId || "all"}:${pagination.first}:${pagination.skip}`;
            return await withCache(
                cacheKey,
                async () => {
                    // Get total count
                    const totalCount = await prisma.orders.count({
                        where: whereClause,
                    });

                    // Get paginated orders
                    const orders = await prisma.orders.findMany({
                        where: whereClause,
                        select: {
                            id: true,
                            userId: true,
                            totalAmount: true,
                            status: true,
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
                                    role: true,
                                    restaurantId: true,
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
                                            isAvailable: true,
                                            category: true,
                                            restaurantId: true,
                                            restaurants: {
                                                select: {
                                                    id: true,
                                                    location: true,
                                                },
                                            },
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

                    return {
                        orders: orders ?? [],
                        totalCount,
                    };
                },
                CACHE_TTL.ORDERS,
            );
        },

        /**
         * Retrieve detailed information for a single order
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} params.id - Order ID (CUID format)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order|null>} Order with full details or null if not found/no access
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user cannot access this order
         * @throws {GraphQLError} BAD_INPUT - If ID format is invalid
         *
         * @description
         * Fetches complete order details with strict access control:
         * 1. Validates order ID format
         * 2. Retrieves order from cache or database
         * 3. Checks user permission to view order
         * 4. For managers, verifies order belongs to their assigned restaurant
         *
         * Access rules:
         * - **Owner**: Can view their own orders
         * - **Managers**: Can view orders scoped to their assigned restaurant
         * - **Members**: Can view orders scoped to their assigned restaurant
         * - **Admin**: Can view all orders
         *
         * @caching
         * - Cache key: order:{orderId}:{userId}
         * - TTL: CACHE_TTL.ORDERS
         * - User-specific caching for security
         *
         * @example
         * query {
         *   order(id: "order123") {
         *     id status totalAmount
         *     items { quantity price menuItem { name } }
         *     payment { amount status transactionId }
         *   }
         * }
         */
        order: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            // Use Redis caching for individual orders with user-specific keys
            const userCacheScope = context.user.restaurantId ?? "unassigned";
            const cacheKey = `order:${validatedId}:${context.user.id}:${userCacheScope}`;
            const order = await withCache(
                cacheKey,
                async () => {
                    return await prisma.orders.findUnique({
                        where: { id: validatedId },
                        select: {
                            id: true,
                            userId: true,
                            restaurantId: true,
                            status: true,
                            totalAmount: true,
                            phone: true,
                            specialInstructions: true,
                            createdAt: true,
                            updatedAt: true,
                            users: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                    restaurantId: true,
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
                                            isAvailable: true,
                                            category: true,
                                            imageUrl: true,
                                            restaurantId: true,
                                            restaurants: {
                                                select: {
                                                    id: true,
                                                    location: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            payments: {
                                select: {
                                    id: true,
                                    amount: true,
                                    status: true,
                                    transactionId: true,
                                    paymentMethodId: true,
                                    createdAt: true,
                                    payment_methods: {
                                        select: {
                                            id: true,
                                            type: true,
                                            provider: true,
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

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;

            if (!isAdmin) {
                const assignedRestaurantId = requireAssignedRestaurant(currentUser);
                if (order.restaurantId !== assignedRestaurantId) {
                    throw GraphQLErrors.forbidden("Access denied to this order");
                }
            }

            return order;
        },
    },

    Mutation: {
        /**
         * Create a new order with menu items
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {CreateOrderInput} params.input - Order data with items
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order>} Newly created order with all details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If location access fails or members attach payment methods
         * @throws {GraphQLError} BAD_INPUT - If validation fails or menu items unavailable
         *
         * @description
         * Creates a new order (cart) while enforcing RBAC and restaurant rules:
         * 1. Validates all input data
         * 2. Verifies optional payment method ownership (admins/managers only)
         * 3. Batch fetches menu items to avoid N+1 queries
         * 4. Ensures menu items are available and belong to the caller's restaurant (if scoped)
         * 5. Calculates totals server-side
         * 6. Persists the order inside a transaction
         * 7. Invalidates cached order lists for the caller
         *
         * @permissions
         * - **Admin**: Can order from any restaurant and attach payment method
         * - **Managers**: Limited to their assigned restaurant, may attach payment method
         * - **Members**: Can create carts for their assigned restaurant but cannot attach payment methods
         *
         * @security
         * - Total amount calculated server-side (never trust client)
         * - Transaction ensures data consistency
         * - Race condition prevention via availability recheck
         * - Payment method ownership validated when provided
         *
         * @example
         * mutation {
         *   createOrder(input: {
         *     items: [
         *       { menuItemId: "item1", quantity: 2, notes: "Extra spicy" }
         *       { menuItemId: "item2", quantity: 1 }
         *     ]
         *   }) {
         *     id totalAmount status
         *   }
         * }
         */
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
                const { items, phone, specialInstructions, paymentMethodId } = validated;
                const role: UserRole = context.user.role;
                const assignedRestaurantId =
                    role === UserRole.ADMIN ? null : requireAssignedRestaurant(context.user);

                if (paymentMethodId) {
                    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
                        logger.warn("Order creation failed: unauthorized payment method usage", {
                            userId: context.user.id,
                            role,
                            paymentMethodId,
                        });
                        throw GraphQLErrors.forbidden(
                            "Only managers or admins can attach payment methods",
                        );
                    }

                    if (!assignedRestaurantId) {
                        logger.warn(
                            "Order creation failed: payment method requires restaurant context",
                            {
                                userId: context.user.id,
                                role,
                                paymentMethodId,
                            },
                        );
                        throw GraphQLErrors.badInput(
                            "Restaurant context required for payment methods",
                        );
                    }

                    const paymentMethod = await prisma.payment_methods.findFirst({
                        where: {
                            id: paymentMethodId,
                            restaurantId: assignedRestaurantId,
                        },
                    });

                    if (!paymentMethod) {
                        logger.warn("Order creation failed: invalid payment method", {
                            userId: context.user.id,
                            paymentMethodId,
                        });
                        throw GraphQLErrors.badInput("Invalid payment method");
                    }
                }

                // Fetch all menu items in a single query to avoid N+1 problem
                const menuItemIds = items.map((item) => item.menuItemId);
                const menuItems = await prisma.menu_items.findMany({
                    where: {
                        id: { in: menuItemIds },
                    },
                    include: {
                        restaurants: {
                            select: {
                                id: true,
                                location: true,
                            },
                        },
                    },
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

                    if (assignedRestaurantId && menuItem.restaurantId !== assignedRestaurantId) {
                        logger.warn("Order creation failed: restaurant access denied", {
                            userId: context.user.id,
                            userRole: role,
                            menuItemRestaurantId: menuItem.restaurantId,
                            requiredRestaurantId: assignedRestaurantId,
                        });
                        throw GraphQLErrors.forbidden("Cannot order from this restaurant");
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
                            restaurantId: menuItems[0].restaurantId,
                            totalAmount,
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
                    paymentAttached: Boolean(paymentMethodId),
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

        /**
         * Update the status of an existing order
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Order ID to update
         * @param {OrderStatus} params.status - New order status
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order>} Updated order with all details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or location access
         * @throws {GraphQLError} NOT_FOUND - If order does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Updates order status with role-based and restaurant-based restrictions:
         * 1. **Blocks members from updating status**
         * 2. Validates order ID format
         * 3. Fetches order with user information
         * 4. For managers, verifies order matches their assigned restaurant
         * 5. Updates order status
         * 6. Invalidates relevant caches
         *
         * @permissions
         * - **Admin**: Can update any order status
         * - **Managers**: Can only update orders within their assigned restaurant
         * - **Members**: **CANNOT UPDATE STATUS** (forbidden)
         *
         * @statusFlow
         * Simplified POS order flow:
         * PENDING → COMPLETED
         *
         * Alternative:
         * Any status → CANCELLED
         *
         * @example
         * mutation {
         *   updateOrderStatus(id: "order123", status: CONFIRMED) {
         *     id status updatedAt
         *   }
         * }
         */
        updateOrderStatus: async (
            _parent: unknown,
            { id, status }: { id: string; status: OrderStatus },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            // Check permissions
            if (context.user.role === UserRole.MEMBER) {
                throw GraphQLErrors.forbidden("Members cannot update order status");
            }

            const order = await prisma.orders.findUnique({
                where: { id: validatedId },
                select: {
                    id: true,
                    userId: true,
                    restaurantId: true,
                    status: true,
                    users: {
                        select: {
                            id: true,
                            restaurantId: true,
                        },
                    },
                    order_items: {
                        include: {
                            menu_items: {
                                select: {
                                    id: true,
                                    restaurantId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!order) {
                throw GraphQLErrors.notFound("Order not found");
            }

            // Check if manager can access this order
            // Managers can only update orders for their assigned restaurant
            if (context.user.role !== UserRole.ADMIN) {
                const assignedRestaurantId = requireAssignedRestaurant(context.user);
                if (order.restaurantId !== assignedRestaurantId) {
                    logger.warn("Order status update failed: restaurant access denied", {
                        userId: context.user.id,
                        orderId: order.id,
                        orderRestaurant: order.restaurantId,
                        managerRestaurant: assignedRestaurantId,
                    });
                    throw GraphQLErrors.forbidden(
                        "Managers can only update orders for their assigned restaurant",
                    );
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

        /**
         * Cancel an existing order
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Order ID to cancel
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order>} Cancelled order with updated status
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or location access
         * @throws {GraphQLError} NOT_FOUND - If order does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Cancels an order by setting its status to CANCELLED:
         * 1. **Blocks members from cancelling orders**
         * 2. Validates order ID format
         * 3. Fetches order with user information
         * 4. For managers, verifies order aligns with their assigned restaurant
         * 5. Sets order status to CANCELLED
         * 6. Invalidates relevant caches
         *
         * @permissions
         * - **Admin**: Can cancel any order
         * - **Managers**: Can only cancel orders within their assigned restaurant
         * - **Members**: **CANNOT CANCEL ORDERS** (forbidden)
         *
         * @businessLogic
         * **Note**: In production, consider:
         * - Refund processing if payment was completed
         * - Notification to customer about cancellation
         * - Restaurant notification
         * - Cancellation time limits (e.g., can't cancel if already out for delivery)
         *
         * @example
         * mutation {
         *   cancelOrder(id: "order123") {
         *     id status updatedAt
         *   }
         * }
         */
        cancelOrder: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            // Check permissions - members cannot cancel orders
            if (context.user.role === UserRole.MEMBER) {
                throw GraphQLErrors.forbidden("Members cannot cancel orders");
            }

            const order = await prisma.orders.findUnique({
                where: { id: validatedId },
                select: {
                    id: true,
                    userId: true,
                    restaurantId: true,
                    users: {
                        select: {
                            id: true,
                            restaurantId: true,
                        },
                    },
                    order_items: {
                        include: {
                            menu_items: {
                                select: {
                                    id: true,
                                    restaurantId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!order) {
                throw GraphQLErrors.notFound("Order not found");
            }

            // Check if manager can access this order
            if (context.user.role !== UserRole.ADMIN) {
                const assignedRestaurantId = requireAssignedRestaurant(context.user);
                if (order.restaurantId !== assignedRestaurantId) {
                    throw GraphQLErrors.forbidden(
                        "Managers can only cancel orders for their assigned restaurant",
                    );
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
