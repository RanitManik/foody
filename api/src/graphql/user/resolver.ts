/**
 * @fileoverview User Management Resolvers
 * @module graphql/user/resolver
 * @description Handles user administration operations with admin-only access.
 * Provides user listing, details viewing, role management, and account control.
 *
 * @features
 * - User listing with pagination
 * - User details with orders and payment methods
 * - User role and restaurant updates
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

import bcrypt from "bcryptjs";
import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validationSchemas,
    UpdateUserInputSchema,
    CreateUserInputSchema,
    validateInput,
} from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext } from "../../types/graphql";
import type { UpdateUserInput, CreateUserInput } from "./types";
import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { withCache, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

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
         *     id email firstName lastName role restaurantId isActive
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

            const pagination = parsePagination({ first, skip });
            const whereClause: Prisma.usersWhereInput = {};

            // Use Redis caching for users queries (admin only)
            const cacheKey = `users:admin:${pagination.first}:${pagination.skip}`;
            return await withCache(
                cacheKey,
                async () => {
                    // Get total count
                    const totalCount = await prisma.users.count({
                        where: whereClause,
                    });

                    // Get paginated users
                    const users = await prisma.users.findMany({
                        where: whereClause,
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                            restaurantId: true,
                            isActive: true,
                            createdAt: true,
                            updatedAt: true,
                            restaurant: {
                                select: {
                                    id: true,
                                    name: true,
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
                        users: users ?? [],
                        totalCount,
                    };
                },
                CACHE_TTL.USER_DATA,
            );
        },

        user: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            // Use Redis caching for individual users (admin only)
            const cacheKey = `user:${validatedId}`;
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
                            restaurantId: true,
                            isActive: true,
                            createdAt: true,
                            updatedAt: true,
                            restaurant: {
                                select: {
                                    id: true,
                                    name: true,
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
         * Create a new user account (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {{ input: CreateUserInput }} params - Mutation parameters
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<User>} Created user object
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} BAD_INPUT - If validation fails or user already exists
         *
         * @description
         * Creates a new user account with comprehensive validation:
         * 1. Validates admin permissions
         * 2. Validates and sanitizes all input fields
         * 3. Checks for existing user with same email
         * 4. Ensures non-admin roles have restaurant assignment
         * 5. Hashes password securely
         * 6. Creates user record in database
         * 7. Invalidates user caches and logs creation
         *
         * @permissions
         * - **Admin**: Can create any user account
         * - **Others**: Forbidden
         *
         * @security
         * - Passwords are hashed with bcrypt (12 salt rounds)
         * - Email uniqueness enforced
         * - Restaurant assignment required for non-admin roles
         *
         * @example
         * mutation {
         *   createUser(input: {
         *     email: "user@example.com"
         *     password: "SecurePass123"
         *     firstName: "John"
         *     lastName: "Doe"
         *     role: MEMBER
         *     restaurantId: "restaurant-123"
         *     isActive: true
         *   }) {
         *     id email firstName lastName role restaurantId isActive
         *   }
         * }
         */
        createUser: async (
            _parent: unknown,
            { input }: { input: CreateUserInput },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("User creation failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                });
                throw GraphQLErrors.forbidden("Admin access required to create users");
            }

            try {
                const validatedInput = validateInput(CreateUserInputSchema, input);

                // Check if user already exists
                const existingUser = await prisma.users.findUnique({
                    where: { email: validatedInput.email },
                });

                if (existingUser) {
                    logger.warn("User creation failed: user already exists", {
                        email: validatedInput.email,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.badInput("User already exists");
                }

                // Validate restaurant assignment for non-admin roles
                if (validatedInput.role !== UserRole.ADMIN && !validatedInput.restaurantId) {
                    logger.warn("User creation failed: restaurant required for non-admin role", {
                        email: validatedInput.email,
                        requestedRole: validatedInput.role,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.badInput(
                        "Managers and members must have an assigned restaurant",
                    );
                }

                // If restaurantId is provided, verify it exists
                if (validatedInput.restaurantId) {
                    const restaurant = await prisma.restaurants.findUnique({
                        where: { id: validatedInput.restaurantId },
                        select: { id: true },
                    });

                    if (!restaurant) {
                        logger.warn("User creation failed: restaurant not found", {
                            email: validatedInput.email,
                            restaurantId: validatedInput.restaurantId,
                            adminId: context.user.id,
                        });
                        throw GraphQLErrors.badInput("Restaurant not found");
                    }
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(validatedInput.password, 12);

                // Create user
                const user = await prisma.users.create({
                    data: {
                        email: validatedInput.email,
                        password: hashedPassword,
                        firstName: validatedInput.firstName,
                        lastName: validatedInput.lastName,
                        role: validatedInput.role,
                        restaurantId: validatedInput.restaurantId || null,
                        isActive: validatedInput.isActive ?? true,
                    },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        restaurantId: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                logger.info("User created successfully", {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    adminId: context.user.id,
                });

                // Invalidate user caches since a new user was added
                await deleteCacheByPattern("users:admin:*");
                await deleteCacheByPattern("user:*");

                return user;
            } catch (error) {
                logger.error("User creation failed", {
                    adminId: context.user?.id,
                    input: { ...input, password: "[REDACTED]" },
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Update user properties (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {{ id: string; input: UpdateUserInput }} params - Mutation parameters
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<User>} Updated user object
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If user to update does not exist
         * @throws {GraphQLError} BAD_INPUT - If validation fails or no fields provided
         *
         * @description
         * Updates user account properties with comprehensive validation:
         * 1. Validates admin permissions
         * 2. Validates ID format and input payload
         * 3. Ensures non-admin roles always have an assigned restaurant
         * 4. Hashes password updates securely
         * 5. Invalidates user caches and logs changes
         */
        updateUser: async (
            _parent: unknown,
            { id, input }: { id: string; input: UpdateUserInput },
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
                const validatedId = validationSchemas.id.parse(id);
                const validatedInput = validateInput(UpdateUserInputSchema, input);

                const existingUser = await prisma.users.findUnique({
                    where: { id: validatedId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        restaurantId: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                if (!existingUser) {
                    logger.warn("User update failed: user not found", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.notFound("User not found");
                }

                // Prevent admin from deactivating themselves
                if (validatedInput.isActive === false && existingUser.id === context.user.id) {
                    logger.warn("User update failed: cannot deactivate self", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.badInput("You cannot deactivate your own account");
                }

                // Prevent deactivating any admin
                if (validatedInput.isActive === false && existingUser.role === UserRole.ADMIN) {
                    logger.warn("User update failed: cannot deactivate admin", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.badInput("Admin accounts cannot be deactivated");
                }

                const nextRole = validatedInput.role ?? existingUser.role;
                const nextRestaurantId =
                    validatedInput.restaurantId !== undefined
                        ? validatedInput.restaurantId
                        : existingUser.restaurantId;

                if (nextRole !== UserRole.ADMIN && !nextRestaurantId) {
                    logger.warn("User update failed: restaurant required for non-admin role", {
                        targetUserId: existingUser.id,
                        requestedRole: nextRole,
                        currentRestaurant: existingUser.restaurantId,
                    });
                    throw GraphQLErrors.badInput(
                        "Managers and members must have an assigned restaurant",
                    );
                }

                // If restaurantId is being updated, verify it exists
                if (
                    validatedInput.restaurantId !== undefined &&
                    validatedInput.restaurantId !== null
                ) {
                    const restaurant = await prisma.restaurants.findUnique({
                        where: { id: validatedInput.restaurantId },
                        select: { id: true },
                    });

                    if (!restaurant) {
                        logger.warn("User update failed: restaurant not found", {
                            targetUserId: existingUser.id,
                            requestedRestaurantId: validatedInput.restaurantId,
                        });
                        throw GraphQLErrors.badInput("Restaurant not found");
                    }
                }

                const updateData: Prisma.usersUncheckedUpdateInput = {};

                if (validatedInput.email !== undefined) {
                    updateData.email = validatedInput.email;
                }

                if (validatedInput.password !== undefined) {
                    updateData.password = await bcrypt.hash(validatedInput.password, 12);
                }

                if (validatedInput.firstName !== undefined) {
                    updateData.firstName = validatedInput.firstName;
                }

                if (validatedInput.lastName !== undefined) {
                    updateData.lastName = validatedInput.lastName;
                }

                if (validatedInput.role !== undefined) {
                    updateData.role = validatedInput.role;
                }

                if (validatedInput.restaurantId !== undefined) {
                    updateData.restaurantId = validatedInput.restaurantId;
                }

                if (validatedInput.isActive !== undefined) {
                    updateData.isActive = validatedInput.isActive;
                }

                if (Object.keys(updateData).length === 0) {
                    logger.warn("User update failed: no fields provided", {
                        adminId: context.user.id,
                        targetUserId: validatedId,
                    });
                    throw GraphQLErrors.badInput("No update fields provided");
                }

                const updatedUser = await prisma.users.update({
                    where: { id: validatedId },
                    data: updateData,
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        restaurantId: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                });

                logger.info("User updated successfully", {
                    targetUserId: updatedUser.id,
                    targetUserEmail: updatedUser.email,
                    adminId: context.user.id,
                    changes: {
                        email:
                            validatedInput.email !== undefined
                                ? `${existingUser.email} → ${updatedUser.email}`
                                : undefined,
                        firstName:
                            validatedInput.firstName !== undefined
                                ? `${existingUser.firstName} → ${updatedUser.firstName}`
                                : undefined,
                        lastName:
                            validatedInput.lastName !== undefined
                                ? `${existingUser.lastName} → ${updatedUser.lastName}`
                                : undefined,
                        role:
                            validatedInput.role !== undefined
                                ? `${existingUser.role} → ${updatedUser.role}`
                                : undefined,
                        restaurantId:
                            validatedInput.restaurantId !== undefined
                                ? `${existingUser.restaurantId ?? "none"} → ${
                                      updatedUser.restaurantId ?? "none"
                                  }`
                                : undefined,
                        isActive:
                            validatedInput.isActive !== undefined
                                ? `${existingUser.isActive} → ${updatedUser.isActive}`
                                : undefined,
                        password: validatedInput.password !== undefined ? "updated" : undefined,
                    },
                });

                await deleteCacheByPattern("users:admin:*");

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
         * - User role and assigned restaurant (for audit trail)
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
                        restaurantId: true,
                    },
                });

                if (!userToDelete) {
                    logger.warn("User deletion failed: user not found", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.notFound("User not found");
                }

                // Prevent deleting any admin
                if (userToDelete.role === UserRole.ADMIN) {
                    logger.warn("User deletion failed: cannot delete admin", {
                        targetUserId: validatedId,
                        adminId: context.user.id,
                    });
                    throw GraphQLErrors.badInput("Admin accounts cannot be deleted");
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
                    deletedUserRestaurantId: userToDelete.restaurantId,
                    adminId: context.user.id,
                });

                // Invalidate user caches
                await deleteCacheByPattern("users:admin:*");
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
