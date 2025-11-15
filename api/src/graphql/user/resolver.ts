import { z } from "zod";
import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import { validationSchemas, UserRoleEnum, CountryEnum } from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext } from "../../types/graphql";
import { UserRole, Country } from "@prisma/client";
import { withCache, createCacheKey, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

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

                // Use Redis caching for users queries (admin only)
                const cacheKey = createCacheKey.user("admin");
                const users = await withCache(
                    cacheKey,
                    async () => {
                        return await prisma.users.findMany({
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                role: true,
                                country: true,
                                isActive: true,
                                createdAt: true,
                                orders: {
                                    select: {
                                        id: true,
                                        status: true,
                                        totalAmount: true,
                                        createdAt: true,
                                    },
                                },
                                payment_methods: {
                                    select: {
                                        id: true,
                                        type: true,
                                        provider: true,
                                        isDefault: true,
                                    },
                                },
                            },
                            take: pagination.first,
                            skip: pagination.skip,
                            orderBy: {
                                createdAt: "desc",
                            },
                        });
                    },
                    CACHE_TTL.USER_DATA,
                );

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

            // Use Redis caching for individual users (admin only)
            const cacheKey = createCacheKey.user(validatedId);
            return await withCache(
                cacheKey,
                async () => {
                    return await prisma.users.findUnique({
                        where: { id: validatedId },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                            country: true,
                            isActive: true,
                            createdAt: true,
                            orders: {
                                select: {
                                    id: true,
                                    status: true,
                                    totalAmount: true,
                                    createdAt: true,
                                },
                                orderBy: { createdAt: "desc" },
                                take: 10, // Limit to recent orders for performance
                            },
                            payment_methods: {
                                select: {
                                    id: true,
                                    type: true,
                                    isDefault: true,
                                    createdAt: true,
                                },
                            },
                        },
                    });
                },
                CACHE_TTL.USER_DATA,
            );
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

            return await prisma.users
                .update({
                    where: { id: validatedId },
                    data: updateData,
                })
                .then((user) => {
                    // Invalidate user caches
                    deleteCacheByPattern("user:*");
                    return user;
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

            // Invalidate user caches
            deleteCacheByPattern("user:*");

            return true;
        },
    },
};
