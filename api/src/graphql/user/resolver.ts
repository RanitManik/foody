import { z } from "zod";
import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import { validationSchemas, UserRoleEnum, CountryEnum } from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext } from "../../types/graphql";
import { UserRole, Country } from "@prisma/client";

export const userResolvers = {
    Query: {
        users: async (
            _parent: unknown,
            { first, skip }: { first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("Users query failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                });
                throw GraphQLErrors.forbidden();
            }

            try {
                const pagination = parsePagination({ first, skip });
                const users = await prisma.users.findMany({
                    include: {
                        orders: true,
                        payment_methods: true,
                    },
                    take: pagination.first,
                    skip: pagination.skip,
                    orderBy: {
                        createdAt: "desc",
                    },
                });

                logger.info("Users queried successfully", {
                    userId: context.user.id,
                    resultCount: users.length,
                });

                return users;
            } catch (error) {
                logger.error("Users query failed", {
                    userId: context.user?.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        user: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            return await prisma.users.findUnique({
                where: { id: validatedId },
                include: {
                    orders: true,
                    payment_methods: true,
                },
            });
        },
    },

    Mutation: {
        updateUser: async (
            _parent: unknown,
            {
                id,
                role,
                country,
                isActive,
            }: { id: string; role?: UserRole; country?: Country; isActive?: boolean },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Validate optional fields if provided
            const updateData: { role?: UserRole; country?: Country; isActive?: boolean } = {};
            if (role !== undefined) {
                updateData.role = UserRoleEnum.parse(role);
            }
            if (country !== undefined) {
                updateData.country = CountryEnum.parse(country);
            }
            if (isActive !== undefined) {
                updateData.isActive = z.boolean().parse(isActive);
            }

            return await prisma.users.update({
                where: { id: validatedId },
                data: updateData,
            });
        },

        deleteUser: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            await prisma.users.delete({
                where: { id: validatedId },
            });

            return true;
        },
    },
};
