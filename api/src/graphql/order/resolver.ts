/**
 * @fileoverview Order Management Resolvers
 * @module graphql/order/resolver
 * @description Handles complete order lifecycle including creation, tracking, status updates,
 * and cancellation. Implements strict role-based access control with critical business rule:
 * **MEMBERS CANNOT CREATE ORDERS** - only Managers and Admin can place orders.
 *
 * @features
 * - Order creation with multiple menu items
 * - Order status tracking and updates
 * - Order cancellation
 * - Role-based order visibility
 * - Country-specific order management for managers
 * - Transactional order creation for data consistency
 * - N+1 query prevention with batch loading
 * - Redis caching for performance
 *
 * @security
 * - Authentication required for all operations
 * - Members CANNOT create orders (critical business rule)
 * - Managers can only create/manage orders in their country
 * - Users can only view their own orders (except managers/admin)
 * - Order status changes restricted to managers/admin
 * - Payment method validation ensures ownership
 *
 * @businessRules
 * - **CRITICAL**: Members (MEMBER_INDIA, MEMBER_AMERICA) cannot place orders
 * - Managers can only order from restaurants in their country
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
         * - **Manager India**: Orders from MEMBER_INDIA users + their own
         * - **Manager America**: Orders from MEMBER_AMERICA users + their own
         * - **Admin**: All orders in the system
         *
         * Results include full order items, user info, and payment details.
         * Orders are cached per user for performance.
         *
         * @caching
         * - Cache key: orders:{userId}:{first}:{skip}
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
                                            price: true,
                                            isAvailable: true,
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
         * 4. For managers, verifies order is from their country's members
         *
         * Access rules:
         * - **Owner**: Can view their own orders
         * - **Manager India**: Can view orders from MEMBER_INDIA users
         * - **Manager America**: Can view orders from MEMBER_AMERICA users
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
         *     id status totalAmount deliveryAddress
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
                            deliveryAddress: true,
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
        /**
         * Create a new order with menu items
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {CreateOrderInput} params.input - Order data with items and delivery info
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Order>} Newly created order with all details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If member tries to create order or country restriction
         * @throws {GraphQLError} BAD_INPUT - If validation fails or menu items unavailable
         *
         * @description
         * **CRITICAL BUSINESS RULE: MEMBERS CANNOT CREATE ORDERS**
         *
         * Creates a new order with strict validation and transaction safety:
         * 1. **Blocks members from creating orders** (critical restriction)
         * 2. Validates all input data
         * 3. Verifies payment method ownership
         * 4. Batch fetches all menu items (prevents N+1 queries)
         * 5. Validates all items are available
         * 6. For managers, validates restaurants are in their country
         * 7. Calculates total amount server-side (security)
         * 8. Creates order in database transaction (atomicity)
         * 9. Re-checks item availability in transaction (race condition prevention)
         * 10. Invalidates order caches
         * 11. Logs order creation with metadata
         *
         * @permissions
         * - **Admin**: Can order from any restaurant
         * - **Manager India**: Can only order from INDIA restaurants
         * - **Manager America**: Can only order from AMERICA restaurants
         * - **Members**: **CANNOT CREATE ORDERS** (forbidden)
         *
         * @security
         * - Total amount calculated server-side (never trust client)
         * - Transaction ensures data consistency
         * - Race condition prevention via availability recheck
         * - Payment method ownership validated
         * - Menu item prices locked at order time
         *
         * @example
         * mutation {
         *   createOrder(input: {
         *     items: [
         *       { menuItemId: "item1", quantity: 2, notes: "Extra spicy" }
         *       { menuItemId: "item2", quantity: 1 }
         *     ]
         *     deliveryAddress: "123 Main St, Apt 4B, Mumbai 400001"
         *     phone: "+91-98765-43210"
         *     specialInstructions: "Ring doorbell twice"
         *     paymentMethodId: "pm123"
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

            // Members cannot place orders (checkout & pay)
            if (
                context.user.role === UserRole.MEMBER_INDIA ||
                context.user.role === UserRole.MEMBER_AMERICA
            ) {
                logger.warn("Order creation failed: members cannot place orders", {
                    userId: context.user.id,
                    role: context.user.role,
                });
                throw GraphQLErrors.forbidden(
                    "Members cannot place orders. Please contact your manager.",
                );
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

                    // Check country access for managers (members are already blocked)
                    if (context.user.role !== UserRole.ADMIN) {
                        if (context.user.role === UserRole.MANAGER_INDIA) {
                            if (menuItem.restaurants.country !== "INDIA") {
                                logger.warn("Order creation failed: country access denied", {
                                    userId: context.user.id,
                                    userRole: context.user.role,
                                    restaurantCountry: menuItem.restaurants.country,
                                });
                                throw GraphQLErrors.forbidden("Cannot order from this restaurant");
                            }
                        } else if (context.user.role === UserRole.MANAGER_AMERICA) {
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
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or country access
         * @throws {GraphQLError} NOT_FOUND - If order does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Updates order status with role-based and country-based restrictions:
         * 1. **Blocks members from updating status**
         * 2. Validates order ID format
         * 3. Fetches order with user information
         * 4. For managers, verifies order is from their country
         * 5. Updates order status
         * 6. Invalidates relevant caches
         *
         * @permissions
         * - **Admin**: Can update any order status
         * - **Manager India**: Can only update orders from MEMBER_INDIA users
         * - **Manager America**: Can only update orders from MEMBER_AMERICA users
         * - **Members**: **CANNOT UPDATE STATUS** (forbidden)
         *
         * @statusFlow
         * Typical order flow:
         * PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
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
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or country access
         * @throws {GraphQLError} NOT_FOUND - If order does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Cancels an order by setting its status to CANCELLED:
         * 1. **Blocks members from cancelling orders**
         * 2. Validates order ID format
         * 3. Fetches order with user information
         * 4. For managers, verifies order is from their country
         * 5. Sets order status to CANCELLED
         * 6. Invalidates relevant caches
         *
         * @permissions
         * - **Admin**: Can cancel any order
         * - **Manager India**: Can only cancel orders from MEMBER_INDIA users
         * - **Manager America**: Can only cancel orders from MEMBER_AMERICA users
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
