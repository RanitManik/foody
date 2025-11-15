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
        paymentMethods: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
            if (!context.user) {
                logger.warn("Payment methods query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                const paymentMethods = await prisma.payment_methods.findMany({
                    where: { userId: context.user.id },
                    orderBy: { createdAt: "desc" },
                });

                logger.info("Payment methods retrieved successfully", {
                    userId: context.user.id,
                    count: paymentMethods.length,
                });

                return paymentMethods;
            } catch (error) {
                logger.error("Payment methods query failed", {
                    userId: context.user?.id,
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

            try {
                // Validate ID
                const validatedId = validationSchemas.cuid.parse(id);

                const paymentMethod = await prisma.payment_methods.findFirst({
                    where: {
                        id: validatedId,
                        userId: context.user.id,
                    },
                });

                if (!paymentMethod) {
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                logger.info("Payment method retrieved successfully", {
                    paymentMethodId: paymentMethod.id,
                    userId: context.user.id,
                });

                return paymentMethod;
            } catch (error) {
                logger.error("Payment method query failed", {
                    userId: context.user?.id,
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

            // Only admins can see all payments
            if (context.user.role !== "ADMIN") {
                logger.warn("Payments query failed: insufficient permissions", {
                    userId: context.user.id,
                    role: context.user.role,
                });
                throw GraphQLErrors.forbidden("Admin access required");
            }

            try {
                const payments = await prisma.payments.findMany({
                    include: {
                        payment_methods: true,
                        orders: true,
                    },
                    orderBy: { createdAt: "desc" },
                });

                logger.info("Payments retrieved successfully", {
                    userId: context.user.id,
                    count: payments.length,
                });

                return payments;
            } catch (error) {
                logger.error("Payments query failed", {
                    userId: context.user?.id,
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
         *     order { id totalAmount deliveryAddress }
         *   }
         * }
         */
        payment: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                logger.warn("Payment query failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.cuid.parse(id);

                const payment = await prisma.payments.findFirst({
                    where: { id: validatedId },
                    include: {
                        payment_methods: true,
                        orders: true,
                    },
                });

                if (!payment) {
                    throw GraphQLErrors.notFound("Payment not found");
                }

                // Users can only see their own payments, admins can see all
                if (
                    context.user.role !== "ADMIN" &&
                    payment.payment_methods?.userId !== context.user.id
                ) {
                    logger.warn("Payment query failed: access denied", {
                        userId: context.user.id,
                        paymentId: payment.id,
                        paymentUserId: payment.payment_methods?.userId,
                    });
                    throw GraphQLErrors.forbidden("Access denied");
                }

                logger.info("Payment retrieved successfully", {
                    paymentId: payment.id,
                    userId: context.user.id,
                });

                return payment;
            } catch (error) {
                logger.error("Payment query failed", {
                    userId: context.user?.id,
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
            { input }: { input: CreatePaymentMethodInput },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment method creation failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                // Validate input
                const validated = validateInput(CreatePaymentMethodInputSchema, input);
                const { type, provider } = validated;

                // In a real app, you'd process the payment token with Stripe/PayPal
                // For now, we'll just store basic info
                const paymentMethod = await prisma.payment_methods.create({
                    data: {
                        userId: context.user.id,
                        type,
                        provider,
                        last4: "4242", // Mock data
                    },
                });

                logger.info("Payment method created successfully", {
                    paymentMethodId: paymentMethod.id,
                    userId: context.user.id,
                    type: paymentMethod.type,
                    provider: paymentMethod.provider,
                });

                return paymentMethod;
            } catch (error) {
                logger.error("Payment method creation failed", {
                    userId: context.user?.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        updatePaymentMethod: async (
            _parent: unknown,
            { id, isDefault }: { id: string; isDefault: boolean },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Verify ownership
            const paymentMethod = await prisma.payment_methods.findFirst({
                where: {
                    id: validatedId,
                    userId: context.user.id,
                },
            });

            if (!paymentMethod) {
                throw GraphQLErrors.notFound("Payment method not found");
            }

            // If setting as default, unset other defaults
            if (isDefault) {
                await prisma.payment_methods.updateMany({
                    where: { userId: context.user.id },
                    data: { isDefault: false },
                });
            }

            return await prisma.payment_methods.update({
                where: { id: validatedId },
                data: { isDefault },
            });
        },

        deletePaymentMethod: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Verify ownership
            const paymentMethod = await prisma.payment_methods.findFirst({
                where: {
                    id: validatedId,
                    userId: context.user.id,
                },
            });

            if (!paymentMethod) {
                throw GraphQLErrors.notFound("Payment method not found");
            }

            await prisma.payment_methods.delete({
                where: { id: validatedId },
            });

            return true;
        },

        processPayment: async (
            _parent: unknown,
            { input }: { input: { orderId: string; paymentMethodId: string; amount: number } },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Payment processing failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                const { orderId, paymentMethodId, amount } = input;

                // Validate IDs
                const validatedOrderId = validationSchemas.cuid.parse(orderId);
                const validatedPaymentMethodId = validationSchemas.cuid.parse(paymentMethodId);

                // Verify order exists and belongs to user
                const order = await prisma.orders.findFirst({
                    where: {
                        id: validatedOrderId,
                        userId: context.user.id,
                    },
                });

                if (!order) {
                    throw GraphQLErrors.notFound("Order not found");
                }

                // Verify payment method exists and belongs to user
                const paymentMethod = await prisma.payment_methods.findFirst({
                    where: {
                        id: validatedPaymentMethodId,
                        userId: context.user.id,
                    },
                });

                if (!paymentMethod) {
                    throw GraphQLErrors.notFound("Payment method not found");
                }

                // Check if order already has a payment
                const existingPayment = await prisma.payments.findUnique({
                    where: { orderId: validatedOrderId },
                });

                if (existingPayment) {
                    throw GraphQLErrors.badInput("Order already has a payment");
                }

                // In a real app, you'd process the payment with Stripe/PayPal
                // For now, we'll simulate payment processing
                const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const payment = await prisma.payments.create({
                    data: {
                        orderId: validatedOrderId,
                        paymentMethodId: validatedPaymentMethodId,
                        amount,
                        status: "completed",
                        transactionId,
                    },
                    include: {
                        payment_methods: true,
                        orders: true,
                    },
                });

                logger.info("Payment processed successfully", {
                    paymentId: payment.id,
                    orderId: payment.orderId,
                    userId: context.user.id,
                    amount: payment.amount,
                    transactionId: payment.transactionId,
                });

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
};
