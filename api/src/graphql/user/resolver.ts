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
            const validatedId = validationSchemas.id.parse(id);

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
        /**
         * Update user properties (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - User ID to update
         * @param {UserRole} [params.role] - New user role (optional)
         * @param {Country} [params.country] - New user country (optional)
         * @param {boolean} [params.isActive] - Account active status (optional)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<User>} Updated user object
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If user to update does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails or invalid role/country
         *
         * @description
         * Updates user account properties with comprehensive validation:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates user ID format (CUID)
         * 3. Validates optional fields:
         *    - role: UserRole enum validation
         *    - country: Country enum validation (INDIA or AMERICA)
         *    - isActive: Boolean validation
         * 4. Updates only provided fields (partial update)
         * 5. Invalidates user caches
         * 6. Logs update with metadata
         *
         * @permissions
         * - **Admin**: Full access to update any user
         * - **Others**: Forbidden
         *
         * @updatableFields
         * - role: Change user role (ADMIN, MANAGER_INDIA, MANAGER_AMERICA, MEMBER_INDIA, MEMBER_AMERICA)
         * - country: Change user country (INDIA or AMERICA)
         * - isActive: Activate/deactivate user account
         *
         * @roleValues
         * - ADMIN: Full system access
         * - MANAGER_INDIA: Manage India country resources
         * - MANAGER_AMERICA: Manage America country resources
         * - MEMBER_INDIA: India team member (limited access)
         * - MEMBER_AMERICA: America team member (limited access)
         *
         * @businessLogic
         * - Admins can change user roles
         * - Inactive users cannot login
         * - Country must match user's location
         * - Managers are country-specific
         * - Members have read-only access to orders
         *
         * @caching
         * Cache invalidation pattern:
         * - user:* (all user caches)
         *
         * @auditLogging
         * All user updates are logged with:
         * - Updated user ID
         * - Admin user ID (who made the change)
         * - Fields that changed
         * - Timestamp
         *
         * @example
         * mutation {
         *   updateUser(
         *     id: "user123"
         *     role: MANAGER_INDIA
         *     country: INDIA
         *     isActive: true
         *   ) {
         *     id email firstName lastName role country isActive
         *   }
         * }
         */
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
                logger.warn("User update failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                    targetUserId: id,
                });
                throw GraphQLErrors.forbidden("Admin access required to update users");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

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

                // Verify user exists before updating
                const existingUser = await prisma.users.findUnique({
                    where: { id: validatedId },
                    select: { id: true, email: true, role: true, country: true, isActive: true },
                });

                if (!existingUser) {
                    logger.warn("User update failed: user not found", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.notFound("User not found");
                }

                // Perform update
                const updatedUser = await prisma.users.update({
                    where: { id: validatedId },
                    data: updateData,
                });

                logger.info("User updated successfully", {
                    targetUserId: updatedUser.id,
                    targetUserEmail: updatedUser.email,
                    adminId: context.user.id,
                    changes: {
                        role: role ? `${existingUser.role} → ${role}` : undefined,
                        country: country ? `${existingUser.country} → ${country}` : undefined,
                        isActive:
                            isActive !== undefined
                                ? `${existingUser.isActive} → ${isActive}`
                                : undefined,
                    },
                });

                // Invalidate user caches
                await deleteCacheByPattern("user:*");

                return updatedUser;
            } catch (error) {
                logger.error("User update failed", {
                    adminId: context.user?.id,
                    targetUserId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Delete a user permanently (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - User ID to delete
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<boolean>} True if deletion successful
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If user to delete does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Permanently removes a user and associated data with admin-only access:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates user ID format
         * 3. Verifies user exists
         * 4. Deletes user from database
         * 5. Cascade deletes associated data:
         *    - Payment methods
         *    - Orders and order items
         * 6. Invalidates all user caches
         * 7. Logs deletion with metadata
         *
         * @permissions
         * - **Admin**: Can delete any user
         * - **Others**: Forbidden
         *
         * @cascadeDelete
         * Due to database schema with CASCADE constraints:
         * - All payment_methods for user deleted
         * - All orders for user deleted
         * - All order_items referencing user's orders deleted
         * - All payments for user's orders deleted
         *
         * @warning
         * This is a permanent operation that cannot be undone.
         * All user data is deleted immediately.
         *
         * @dataRetention
         * In production, consider:
         * - Soft delete: Mark user as inactive instead
         * - Data archival: Archive orders before deletion
         * - Compliance: Ensure GDPR/data deletion compliance
         *
         * @productionRecommendation
         * Replace permanent deletion with:
         * - updateUser(id, { isActive: false })
         * - Implement data archival for compliance
         * - Keep anonymized historical data for analytics
         *
         * @auditLogging
         * Deletion is logged with:
         * - Deleted user ID and email
         * - Admin user ID (who deleted)
         * - Timestamp
         * - User role and country (for audit trail)
         *
         * @example
         * mutation {
         *   deleteUser(id: "user123")
         * }
         */
        deleteUser: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("User deletion failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                    targetUserId: id,
                });
                throw GraphQLErrors.forbidden("Admin access required to delete users");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

                // Verify user exists before deletion
                const userToDelete = await prisma.users.findUnique({
                    where: { id: validatedId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        country: true,
                    },
                });

                if (!userToDelete) {
                    logger.warn("User deletion failed: user not found", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.notFound("User not found");
                }

                // Delete user (cascade deletes orders, payments, etc.)
                await prisma.users.delete({
                    where: { id: validatedId },
                });

                logger.info("User deleted successfully", {
                    deletedUserId: userToDelete.id,
                    deletedUserEmail: userToDelete.email,
                    deletedUserName: `${userToDelete.firstName} ${userToDelete.lastName}`,
                    deletedUserRole: userToDelete.role,
                    deletedUserCountry: userToDelete.country,
                    adminId: context.user.id,
                });

                // Invalidate user caches
                await deleteCacheByPattern("user:*");

                return true;
            } catch (error) {
                logger.error("User deletion failed", {
                    adminId: context.user?.id,
                    targetUserId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    },
};
