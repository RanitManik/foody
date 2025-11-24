/**
 * @fileoverview Payment Management Resolvers
 * @module graphql/payment/resolver
 * @description Handles payment methods and payment processing operations.
 * Implements user ownership verification, admin-only queries, and mock payment processing.
 *
 * @features
 * - Payment method CRUD operations
 * - Payment transaction processing
 * - Default payment method management
 * - Admin-only all payments query
 * - User ownership verification
 *
 * @security
 * - Users can only access their own payment methods
 * - Admin can view all payments
 * - Payment method ownership validated before operations
 * - Payment processing requires order and method ownership
 *
 * @payments
 * **Note**: Current implementation uses mock payment processing.
 * In production, integrate with real payment providers:
 * - Stripe (STRIPE provider)
 * - PayPal (PAYPAL provider)
 * - Razorpay (RAZORPAY provider)
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validateInput,
    CreatePaymentMethodInputSchema,
    validationSchemas,
} from "../../lib/shared/validation";
import { GraphQLContext, CreatePaymentMethodInput } from "../../types/graphql";
import { deleteCacheByPattern } from "../../lib/shared/cache";
import { UserRole, OrderStatus } from "@prisma/client";

const requireRestaurantId = (user: NonNullable<GraphQLContext["user"]>): string => {
    if (!user.restaurantId) {
        logger.warn("Restaurant assignment missing for payment operation", {
            userId: user.id,
            role: user.role,
        });
        throw GraphQLErrors.forbidden("Restaurant assignment required for this action");
    }

    return user.restaurantId;
};

export const paymentResolvers = {
    Query: {
        /**
         * Get all payment methods for the current user
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {unknown} _args - Query arguments (unused)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<PaymentMethod[]>} Array of user's payment methods
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         *
         * @description
         * Retrieves all payment methods associated with the authenticated user,
         * ordered by creation date (newest first).
         *
         * @example
         * query {
         *   paymentMethods {
         *     id type provider last4 isDefault
         *   }
         * }
         */
        paymentMethods: async (_parent: unknown, { restaurantId }: { restaurantId?: string }, context: GraphQLContext) => {
            if (!context.user) {
                logger.warn("Payment methods query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                logger.warn("Payment methods query failed: insufficient permissions", {
                    userId: currentUser.id,
                    role: currentUser.role,
                });
                throw GraphQLErrors.forbidden(
                    "Only admins and managers can access payment methods",
                );
            }

            let targetRestaurantId: string;
            if (isAdmin) {
                if (!restaurantId) {
                    throw GraphQLErrors.badInput("restaurantId is required for admins");
                }
                targetRestaurantId = restaurantId;
            } else {
                // Manager
                targetRestaurantId = requireRestaurantId(currentUser);
                if (restaurantId && restaurantId !== targetRestaurantId) {
                    throw GraphQLErrors.forbidden("Access denied to this restaurant's payment methods");
                }
            }

            try {
                const paymentMethods = await prisma.payment_methods.findMany({
                    where: { restaurantId: targetRestaurantId },
                    orderBy: { createdAt: "desc" },
                });

                logger.info("Payment methods retrieved successfully", {
                    userId: currentUser.id,
                    restaurantId: targetRestaurantId,
                    count: paymentMethods.length,
                });

                return paymentMethods;
            } catch (error) {
                logger.error("Payment methods query failed", {
                    userId: currentUser.id,
                    restaurantId: targetRestaurantId,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Get details of a specific payment method
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} params.id - Payment method ID
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<PaymentMethod>} Payment method details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} NOT_FOUND - If payment method not found or doesn't belong to user
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Retrieves details of a specific payment method with ownership verification.
         * Users can only access their own payment methods.
         *
         * @example
         * query {
         *   paymentMethod(id: "pm123") {
         *     id type provider last4 isDefault createdAt
         *   }
         * }
         */
        paymentMethod: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment method query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                logger.warn("Payment method query failed: insufficient permissions", {
                    userId: currentUser.id,
                    role: currentUser.role,
                });
                throw GraphQLErrors.forbidden(
                    "Only admins and managers can access payment methods",
                );
            }

            let targetRestaurantId: string;
            if (isAdmin) {
                // For admin, we might not need restaurantId for single payment method, but let's require it for consistency
                throw GraphQLErrors.badInput("restaurantId is required for admins to access payment methods");
            } else {
                // Manager
                targetRestaurantId = requireRestaurantId(currentUser);
            }

            try {
                const validatedId = validationSchemas.id.parse(id);

                const paymentMethod = await prisma.payment_methods.findFirst({
                    where: {
                        id: validatedId,
                        restaurantId: targetRestaurantId,
                    },
                });

                if (!paymentMethod) {
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                logger.info("Payment method retrieved successfully", {
                    paymentMethodId: paymentMethod.id,
                    userId: currentUser.id,
                });

                return paymentMethod;
            } catch (error) {
                logger.error("Payment method query failed", {
                    userId: currentUser.id,
                    paymentMethodId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Get all payments in the system (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {unknown} _args - Query arguments (unused)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Payment[]>} Array of all payments
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         *
         * @description
         * Retrieves all payment transactions in the system with payment method and order details.
         * **Admin access only** for financial reporting and auditing purposes.
         *
         * @permissions
         * - **Admin**: Full access to all payments
         * - **Others**: Forbidden
         *
         * @example
         * query {
         *   payments {
         *     id amount status transactionId
         *     method { type provider }
         *     order { id totalAmount }
         *   }
         * }
         */
        payments: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
            if (!context.user) {
                logger.warn("Payments query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            if (currentUser.role !== UserRole.ADMIN) {
                logger.warn("Payments query failed: insufficient permissions", {
                    userId: currentUser.id,
                    role: currentUser.role,
                });
                throw GraphQLErrors.forbidden("Admin access required");
            }

            try {
                const payments = await prisma.payments.findMany({
                    include: {
                        payment_methods: true,
                        orders: {
                            include: {
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
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                });

                logger.info("Payments retrieved successfully", {
                    userId: currentUser.id,
                    count: payments.length,
                });

                return payments;
            } catch (error) {
                logger.error("Payments query failed", {
                    userId: currentUser.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Get details of a specific payment transaction
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} params.id - Payment ID
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Payment>} Payment transaction details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user doesn't own the payment
         * @throws {GraphQLError} NOT_FOUND - If payment not found
         *
         * @description
         * Retrieves payment transaction details with ownership verification.
         * Users can only view their own payments; admin can view all.
         *
         * @permissions
         * - **Admin**: Can view any payment
         * - **Others**: Can only view own payments
         *
         * @example
         * query {
         *   payment(id: "pay123") {
         *     id amount status transactionId
         *     method { type last4 }
         *     order { id totalAmount }
         *   }
         * }
         */
        payment: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                logger.warn("Payment query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;

            try {
                const validatedId = validationSchemas.id.parse(id);

                const payment = await prisma.payments.findFirst({
                    where: { id: validatedId },
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        transactionId: true,
                        createdAt: true,
                        updatedAt: true,
                        payment_methods: {
                            select: {
                                id: true,
                                type: true,
                                provider: true,
                                last4: true,
                                restaurantId: true,
                            },
                        },
                        orders: {
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
                            },
                        },
                    },
                });

                if (!payment) {
                    throw GraphQLErrors.notFound("Payment not found");
                }

                // Access control: admin can see all, others can see their own payments
                // or managers can see payments from their restaurant
                const order = payment.orders;
                const orderOwnerId = order?.userId;
                const orderRestaurantId = order?.restaurantId;

                const isAdmin = currentUser.role === UserRole.ADMIN;
                const isManager = currentUser.role === UserRole.MANAGER;
                const isOrderOwner = orderOwnerId === currentUser.id;
                const canAccess = isAdmin || isOrderOwner || (isManager && orderRestaurantId === currentUser.restaurantId);

                if (!canAccess) {
                    logger.warn("Payment query failed: access denied", {
                        userId: currentUser.id,
                        paymentId: payment.id,
                        orderOwnerId,
                        orderRestaurantId,
                    });
                    throw GraphQLErrors.forbidden("Access denied");
                }

                logger.info("Payment retrieved successfully", {
                    paymentId: payment.id,
                    userId: currentUser.id,
                });

                return payment;
            } catch (error) {
                logger.error("Payment query failed", {
                    userId: currentUser.id,
                    paymentId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    },

    Mutation: {
        /**
         * Create a new payment method for the user
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {CreatePaymentMethodInput} params.input - Payment method data
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<PaymentMethod>} Newly created payment method
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} BAD_INPUT - If input validation fails
         *
         * @description
         * Creates a new payment method for the authenticated user.
         *
         * **Note**: Current implementation stores mock data.
         * In production, integrate with payment provider SDKs:
         * - Stripe: Process token from Stripe.js
         * - PayPal: Handle PayPal account linking
         * - Razorpay: Process Razorpay payment method token
         *
         * @production
         * - Implement PCI compliance for card data
         * - Use payment provider SDKs (never store raw card data)
         * - Implement webhook handlers for payment updates
         * - Add 3D Secure/SCA support
         *
         * @example
         * mutation {
         *   createPaymentMethod(input: {
         *     type: CREDIT_CARD
         *     provider: STRIPE
         *     token: "tok_visa"
         *   }) {
         *     id type provider last4 isDefault
         *   }
         * }
         */
        createPaymentMethod: async (
            _parent: unknown,
            { input, restaurantId }: { input: CreatePaymentMethodInput; restaurantId?: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment method creation failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                logger.warn("Payment method creation failed: insufficient permissions", {
                    userId: currentUser.id,
                    role: currentUser.role,
                });

                throw GraphQLErrors.forbidden(
                    "Only admins and managers can manage payment methods",
                );
            }

            let targetRestaurantId: string;
            if (isAdmin) {
                if (!restaurantId) {
                    throw GraphQLErrors.badInput("restaurantId is required for admins");
                }
                targetRestaurantId = restaurantId;
            } else {
                // Manager
                targetRestaurantId = requireRestaurantId(currentUser);
                if (restaurantId && restaurantId !== targetRestaurantId) {
                    throw GraphQLErrors.forbidden("Access denied to this restaurant");
                }
            }

            try {
                // Validate input
                const validated = validateInput(CreatePaymentMethodInputSchema, input);
                const { type, provider } = validated;

                // In a real app, you'd process the payment token with Stripe/PayPal
                // For now, we'll just store basic info
                const paymentMethod = await prisma.payment_methods.create({
                    data: {
                        restaurantId: targetRestaurantId,
                        type,
                        provider,
                        last4: "4242", // Mock data
                        updatedAt: new Date(),
                    },
                });

                logger.info("Payment method created successfully", {
                    paymentMethodId: paymentMethod.id,
                    restaurantId: targetRestaurantId,
                    userId: currentUser.id,
                    type: paymentMethod.type,
                    provider: paymentMethod.provider,
                });

                return paymentMethod;
            } catch (error) {
                logger.error("Payment method creation failed", {
                    userId: currentUser.id,
                    restaurantId: targetRestaurantId,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Update a payment method settings (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Payment method ID to update
         * @param {boolean} params.isDefault - Set as default payment method
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<PaymentMethod>} Updated payment method details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If payment method not found
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Updates payment method settings with admin-only access control:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates payment method ID format
         * 3. Updates payment method settings
         * 4. If setting as default, unsets default flag from other payment methods
         * 5. Logs update operation with metadata
         *
         * @permissions
         * - **Admin**: Full access to update any payment method settings
         * - **Others**: Forbidden (for financial security)
         *
         * @security
         * - **CRITICAL**: Only admin can update payment methods
         * - Users should not be able to modify others' payment information
         * - Prevents unauthorized payment method changes
         *
         * @businessLogic
         * - Only one payment method per user can be marked as default
         * - Setting a new default automatically unsets previous default
         *
         * @example
         * mutation {
         *   updatePaymentMethod(id: "pm123", isDefault: true) {
         *     id type provider last4 isDefault updatedAt
         *   }
         * }
         */
        updatePaymentMethod: async (
            _parent: unknown,
            { id, input }: { id: string; input: { isDefault?: boolean } },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment method update failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            // CRITICAL: Only admins can update payment methods
            if (context.user.role !== UserRole.ADMIN) {
                logger.warn("Payment method update failed: access denied (non-admin)", {
                    userId: context.user.id,
                    paymentMethodId: id,
                    userRole: context.user.role,
                });
                throw GraphQLErrors.forbidden("Admin access required to update payment methods");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

                // Verify payment method exists
                const paymentMethod = await prisma.payment_methods.findUnique({
                    where: { id: validatedId },
                });

                if (!paymentMethod) {
                    logger.warn("Payment method update failed: not found", {
                        paymentMethodId: validatedId,
                    });
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                // If setting as default, unset other defaults for this restaurant
                if (input.isDefault) {
                    await prisma.payment_methods.updateMany({
                        where: {
                            restaurantId: paymentMethod.restaurantId,
                            id: { not: validatedId },
                        },
                        data: { isDefault: false },
                    });
                }

                const updatedMethod = await prisma.payment_methods.update({
                    where: { id: validatedId },
                    data: { isDefault: input.isDefault },
                });

                logger.info("Payment method updated successfully", {
                    paymentMethodId: updatedMethod.id,
                    restaurantId: paymentMethod.restaurantId,
                    adminId: context.user.id,
                    isDefault: updatedMethod.isDefault,
                });

                return updatedMethod;
            } catch (error) {
                logger.error("Payment method update failed", {
                    userId: context.user?.id,
                    paymentMethodId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Delete a payment method permanently (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Payment method ID to delete
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<boolean>} True if deletion successful
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If payment method not found
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Permanently removes a payment method with admin-only access:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates payment method ID format
         * 3. Verifies payment method exists
         * 4. Deletes payment method from database
         * 5. Logs deletion with metadata
         *
         * @permissions
         * - **Admin**: Can delete any payment method
         * - **Others**: Forbidden (for financial security)
         *
         * @security
         * - **CRITICAL**: Only admin can delete payment methods
         * - Prevents unauthorized payment information removal
         * - Protects against user data tampering
         *
         * @dataRetention
         * - If payment method has associated transactions, consider archival instead
         * - Current implementation allows cascade delete
         *
         * @warning
         * This is a permanent operation. Consider implementing soft delete
         * for payment methods with transaction history.
         *
         * @example
         * mutation {
         *   deletePaymentMethod(id: "pm123")
         * }
         */
        deletePaymentMethod: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment method deletion failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            // CRITICAL: Only admins can delete payment methods
            if (context.user.role !== UserRole.ADMIN) {
                logger.warn("Payment method deletion failed: access denied (non-admin)", {
                    userId: context.user.id,
                    paymentMethodId: id,
                    userRole: context.user.role,
                });
                throw GraphQLErrors.forbidden("Admin access required to delete payment methods");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

                // Verify payment method exists
                const paymentMethod = await prisma.payment_methods.findUnique({
                    where: { id: validatedId },
                    select: { id: true, restaurantId: true, provider: true },
                });

                if (!paymentMethod) {
                    logger.warn("Payment method deletion failed: not found", {
                        paymentMethodId: validatedId,
                    });
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                // Check if payment method is referenced by any payments
                const paymentCount = await prisma.payments.count({
                    where: { paymentMethodId: validatedId },
                });

                if (paymentCount > 0) {
                    logger.warn("Payment method deletion failed: referenced by payments", {
                        paymentMethodId: validatedId,
                        paymentCount,
                    });
                    throw GraphQLErrors.badInput(
                        "Cannot delete payment method that has been used for payments. Please contact support for assistance.",
                    );
                }

                await prisma.payment_methods.delete({
                    where: { id: validatedId },
                });

                logger.info("Payment method deleted successfully", {
                    paymentMethodId: validatedId,
                    restaurantId: paymentMethod.restaurantId,
                    adminId: context.user.id,
                    provider: paymentMethod.provider,
                });

                return true;
            } catch (error) {
                logger.error("Payment method deletion failed", {
                    userId: context.user?.id,
                    paymentMethodId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Process payment for an order
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {Object} params.input - Payment processing input
         * @param {string} params.input.orderId - Order ID to process payment for
         * @param {string} params.input.paymentMethodId - Payment method ID to use
         * @param {number} params.input.amount - Payment amount
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Payment>} Created payment transaction with details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} NOT_FOUND - If order or payment method not found
         * @throws {GraphQLError} FORBIDDEN - If payment method doesn't belong to user
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails or order already paid
         *
         * @description
         * Processes a payment transaction for an order with the following workflow:
         * 1. Validates user is authenticated
         * 2. Validates and sanitizes IDs and amount
         * 3. Verifies order exists and belongs to user
         * 4. Verifies payment method exists and belongs to user
         * 5. Checks order doesn't already have a payment
         * 6. Creates payment transaction in database
         * 7. Generates unique transaction ID
         * 8. Logs payment processing with full metadata
         * 9. Returns complete payment details
         *
         * @permissions
         * - **Admins**: Can process any payment
         * - **Managers**: Can process payments for their own orders or members within their assigned restaurant
         * - **Members**: Cannot process payments
         *
         * @security
         * - User ownership of order and payment method verified
         * - Server-side validation of amount (client not trusted)
         * - Transaction ID generation ensures uniqueness
         * - Idempotent checking (one payment per order)
         *
         * @processFlow
         * 1. User adds items to cart (createOrder)
         * 2. User selects payment method (paymentMethods)
         * 3. System displays order total (order query)
         * 4. User initiates payment (processPayment)
         * 5. System creates payment record
         * 6. Order status updated to CONFIRMED
         *
         * @mockPaymentNote
         * **Current implementation**: Uses mock payment processing
         * - Payment automatically marked as "completed"
         * - In production, integrate with payment providers:
         *   - Stripe: Use Stripe SDK to charge card
         *   - PayPal: Redirect to PayPal for authorization
         *   - Razorpay: Use Razorpay API for processing
         *
         * @production
         * Replace mock processing with:
         * - Real payment provider API calls
         * - Webhook handlers for payment status updates
         * - 3D Secure / SCA authentication
         * - Retry logic for failed transactions
         * - Refund capability implementation
         *
         * @example
         * mutation {
         *   processPayment(input: {
         *     orderId: "order123"
         *     paymentMethodId: "pm456"
         *     amount: 45.99
         *   }) {
         *     id amount status transactionId
         *     method { type provider last4 }
         *     order { id totalAmount }
         *   }
         * }
         */
        processPayment: async (
            _parent: unknown,
            { input }: { input: { orderId: string; paymentMethodId: string; amount: number } },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment processing failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                logger.warn("Payment processing failed: insufficient permissions", {
                    userId: currentUser.id,
                    role: currentUser.role,
                });
                throw GraphQLErrors.forbidden("Only admins and managers can process payments");
            }

            const restaurantId = isManager ? requireRestaurantId(currentUser) : null;

            try {
                const { orderId, paymentMethodId, amount } = input;

                const validatedOrderId = validationSchemas.id.parse(orderId);
                const validatedPaymentMethodId = validationSchemas.id.parse(paymentMethodId);

                const order = await prisma.orders.findUnique({
                    where: {
                        id: validatedOrderId,
                    },
                    include: {
                        users: {
                            select: {
                                id: true,
                                role: true,
                                restaurantId: true,
                            },
                        },
                        order_items: {
                            include: {
                                menu_items: {
                                    select: {
                                        id: true,
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
                    },
                });

                if (!order) {
                    logger.warn("Payment processing failed: order not found", {
                        userId: currentUser.id,
                        orderId: validatedOrderId,
                    });
                    throw GraphQLErrors.notFound("Order not found");
                }

                const orderOwnerLocation = order.users?.restaurantId ?? null;
                const orderOwnerRole = order.users?.role ?? null;
                const restaurantLocations = order.order_items
                    .map((item) => item.menu_items?.restaurants?.location)
                    .filter((location): location is string => Boolean(location));

                const isOrderOwner = order.userId === currentUser.id;
                let canProcess = isAdmin || isOrderOwner;

                if (!canProcess && isManager && restaurantId) {
                    const hasForeignRestaurant = restaurantLocations.some(
                        (location) => location !== restaurantId,
                    );
                    const restaurantsMatchLocation =
                        restaurantLocations.length > 0 && !hasForeignRestaurant;
                    const ownerMatchesLocation = orderOwnerLocation === restaurantId;

                    if (
                        orderOwnerRole === UserRole.MEMBER &&
                        restaurantsMatchLocation &&
                        (ownerMatchesLocation || orderOwnerLocation === null)
                    ) {
                        canProcess = true;
                    }

                    if (hasForeignRestaurant) {
                        logger.warn("Payment processing failed: cross-restaurant order detected", {
                            userId: currentUser.id,
                            orderId: order.id,
                            restaurantId,
                            restaurantLocations,
                        });
                        throw GraphQLErrors.forbidden(
                            "Managers can only process payments for their assigned restaurant",
                        );
                    }
                }

                if (!canProcess) {
                    logger.warn("Payment processing failed: access denied to order", {
                        userId: currentUser.id,
                        orderOwnerId: order.userId,
                        orderOwnerRole,
                        requesterRole: currentUser.role,
                    });
                    throw GraphQLErrors.forbidden("Access denied to this order");
                }

                const paymentMethod = await prisma.payment_methods.findFirst({
                    where: {
                        id: validatedPaymentMethodId,
                    },
                    select: {
                        id: true,
                        restaurantId: true,
                        provider: true,
                    },
                });

                if (!paymentMethod) {
                    logger.warn("Payment processing failed: payment method not found", {
                        userId: currentUser.id,
                        paymentMethodId: validatedPaymentMethodId,
                    });
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                // Check if payment method belongs to the same restaurant as the order
                if (paymentMethod.restaurantId !== order.restaurantId) {
                    logger.warn("Payment processing failed: payment method restaurant mismatch", {
                        userId: currentUser.id,
                        paymentMethodRestaurantId: paymentMethod.restaurantId,
                        orderRestaurantId: order.restaurantId,
                        orderId: order.id,
                    });
                    throw GraphQLErrors.forbidden("Payment method does not belong to the order's restaurant");
                }

                const existingPayment = await prisma.payments.findUnique({
                    where: { orderId: validatedOrderId },
                });

                if (existingPayment) {
                    logger.warn("Payment processing failed: order already has payment", {
                        userId: currentUser.id,
                        orderId: validatedOrderId,
                        existingPaymentId: existingPayment.id,
                    });
                    throw GraphQLErrors.badInput(
                        "Order already has a payment. Cannot process duplicate payment.",
                    );
                }

                if (Math.abs(amount - order.totalAmount) > 0.01) {
                    logger.warn("Payment processing failed: amount mismatch", {
                        userId: currentUser.id,
                        orderId: validatedOrderId,
                        expectedAmount: order.totalAmount,
                        providedAmount: amount,
                    });
                    throw GraphQLErrors.badInput("Payment amount does not match order total");
                }

                const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

                const payment = await prisma.$transaction(async (tx) => {
                    const paymentRecord = await tx.payments.create({
                        data: {
                            orderId: validatedOrderId,
                            paymentMethodId: validatedPaymentMethodId,
                            amount,
                            status: "COMPLETED",
                            transactionId,
                        },
                        include: {
                            payment_methods: true,
                            orders: true,
                        },
                    });

                    await tx.orders.update({
                        where: { id: validatedOrderId },
                        data: { status: OrderStatus.COMPLETED },
                    });

                    return paymentRecord;
                });

                logger.info("Payment processed successfully", {
                    paymentId: payment.id,
                    orderId: payment.orderId,
                    userId: currentUser.id,
                    amount: payment.amount,
                    transactionId: payment.transactionId,
                    paymentMethod: paymentMethod.provider,
                });

                await Promise.all([
                    deleteCacheByPattern(`order:${validatedOrderId}:*`),
                    deleteCacheByPattern(`orders:${order.userId}:*`),
                    deleteCacheByPattern(`orders:${currentUser.id}:*`),
                ]);

                return payment;
            } catch (error) {
                logger.error("Payment processing failed", {
                    userId: context.user?.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    },

    /**
     * Field resolvers for Payment type
     * Maps Prisma relationship fields to GraphQL schema fields
     */
    Payment: {
        /**
         * Resolve the method field for a Payment
         * Maps the 'payment_methods' Prisma relation to 'method' GraphQL field
         *
         * @param {Record<string, unknown>} parent - Parent Payment object from Prisma
         * @returns {Record<string, unknown>|null} The payment method object or null if not loaded
         *
         * @description
         * Field resolver that handles the transformation of the Prisma relationship
         * to the GraphQL schema. The Prisma relation is named 'payment_methods' but
         * the GraphQL field is 'method' (singular, abbreviated).
         */
        method: (parent: Record<string, unknown>) => {
            return parent.payment_methods || null;
        },

        /**
         * Resolve the order field for a Payment
         * Maps the 'orders' Prisma relation to 'order' GraphQL field
         *
         * @param {Record<string, unknown>} parent - Parent Payment object from Prisma
         * @returns {Record<string, unknown>|null} The order object or null if not loaded
         *
         * @description
         * Field resolver that handles the transformation of the Prisma relationship
         * to the GraphQL schema. The Prisma relation is named 'orders' but
         * the GraphQL field is 'order' (singular).
         */
        order: (parent: Record<string, unknown>) => {
            return parent.orders || null;
        },
    },
};
