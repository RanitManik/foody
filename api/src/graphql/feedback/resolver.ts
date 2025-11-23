import { prisma } from "../../lib/database";
import { GraphQLErrors } from "../../lib/shared/errors";
import { validateInput, CreateFeedbackInputSchema } from "../../lib/shared/validation";
import { UserRole } from "@prisma/client";
import { logger } from "../../lib/shared/logger";
import { GraphQLContext } from "../../types/graphql";

export const feedbackResolvers = {
    Query: {
        feedbacks: async (
            _parent: unknown,
            { first, skip }: { first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            // Only allow admins to list feedback
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            try {
                return await prisma.feedbacks.findMany({
                    take: first ?? 25,
                    skip: skip ?? 0,
                    orderBy: { createdAt: "desc" },
                });
            } catch (err) {
                logger.error("feedbacks query failed", {
                    error: err instanceof Error ? err.message : String(err),
                });
                throw err;
            }
        },
    },

    Mutation: {
        createFeedback: async (
            _parent: unknown,
            { input }: { input: { message: string; email?: string } },
            context: GraphQLContext,
        ) => {
            try {
                // Validate (and sanitize) input
                const payload = validateInput(CreateFeedbackInputSchema, input);

                // email is optional and we will sanitize if provided
                let email: string | undefined = undefined;
                if (payload.email) {
                    email = payload.email;
                }

                const userId = context.user?.id ?? undefined;

                const created = await prisma.feedbacks.create({
                    data: {
                        message: payload.message,
                        email,
                        userId,
                    },
                });

                logger.info("Feedback received", { id: created.id, userId, email });
                return created;
            } catch (error) {
                logger.error("createFeedback failed", {
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    },
};
