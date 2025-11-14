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
    Mutation: {
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
    },
};
