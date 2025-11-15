/**
 * @fileoverview User Management Resolvers
 * @module graphql/user/resolver
 * @description Handles user administration operations with admin-only access.
 * Provides user listing, details viewing, role management, and account control.
 *
 * @features
 * - User listing with pagination
 * - User details with orders and payment methods
 * - User role and country updates
 * - User account activation/deactivation
 * - User deletion
 * - Redis caching for user data
 *
 * @security
 * - **ALL operations require Admin role**
 * - Authentication required
 * - Comprehensive logging for audit trail
 * - Cache invalidation on updates
 *
 * @permissions
 * - **Admin**: Full access to all user management operations
 * - **Others**: No access (all operations forbidden)
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

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
        /**
         * Get paginated list of all users (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {number} [params.first=10] - Number of users to return
         * @param {number} [params.skip=0] - Number to skip for pagination
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<User[]>} Array of users with orders and payment methods
         *
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         *
         * @description
         * Retrieves all users in the system with their recent orders and payment methods.
         * Cached for performance with admin-specific cache key.
         *
         * **Admin access only** - Used for user management dashboard and analytics.
         *
         * @caching
         * - Cache key: user:admin
         * - TTL: CACHE_TTL.USER_DATA
         * - Invalidated on: user updates/deletes
         *
         * @example
         * query {
         *   users(first: 20, skip: 0) {
         *     id email firstName lastName role country isActive
         *     orders { id status totalAmount }
         *   }
         * }
         */
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
