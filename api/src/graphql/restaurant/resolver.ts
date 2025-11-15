/**
 * @fileoverview Restaurant Management Resolvers
 * @module graphql/restaurant/resolver
 * @description Handles restaurant CRUD operations with country-based filtering and admin-only management.
 * Implements automatic country filtering for non-admin users and Redis caching for performance.
 *
 * @features
 * - Restaurant listing with country filtering
 * - Restaurant details with menu items
 * - Menu categories per restaurant
 * - Admin-only restaurant management (create/update/delete)
 * - Automatic country-based access control
 * - Redis caching with role-specific keys
 *
 * @security
 * - Authentication required for all operations
 * - Country-based read access filtering for non-admins
 * - Admin-only write operations
 * - India/America region isolation
 *
 * @permissions
 * - **View**: All users (auto-filtered by country for non-admin)
 * - **Create/Update/Delete**: Admin only
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validateInput,
    CreateRestaurantInputSchema,
    validationSchemas,
} from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext, CreateRestaurantInput } from "../../types/graphql";
import { UserRole, restaurants, menu_items } from "@prisma/client";
import { withCache, createCacheKey, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

export const restaurantResolvers = {
    Query: {
        /**
         * Retrieve paginated list of restaurants with automatic country filtering
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} [params.country] - Optional country filter
         * @param {number} [params.first=10] - Number of restaurants to return
         * @param {number} [params.skip=0] - Number to skip for pagination
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Restaurant[]>} Array of restaurants with available menu items
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         *
         * @description
         * Fetches restaurants with automatic country-based filtering:
         * - **India users**: Only INDIA restaurants
         * - **America users**: Only AMERICA restaurants
         * - **Admin**: All restaurants (unless country param specified)
         *
         * Results include available menu items and are cached per country.
         *
         * @caching
         * - Cache key: restaurants:{country}
         * - TTL: CACHE_TTL.RESTAURANTS
         * - Invalidated on: restaurant create/update/delete
         *
         * @example
         * query {
         *   restaurants(country: INDIA, first: 10) {
         *     id name description city country
         *     menuCategories
         *   }
         * }
         */
        restaurants: async (
            _parent: unknown,
            { country, first, skip }: { country?: string; first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const pagination = parsePagination({ first, skip });
            const whereClause: Record<string, unknown> = {};

            // Apply country-based filtering for non-admin users
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA ||
                    context.user.role === UserRole.MEMBER_INDIA
                ) {
                    whereClause.country = "INDIA";
                } else if (
                    context.user.role === UserRole.MANAGER_AMERICA ||
                    context.user.role === UserRole.MEMBER_AMERICA
                ) {
                    whereClause.country = "AMERICA";
                }
            }

            // Additional country filter if provided
            if (country) {
                whereClause.country = country;
            }

            // Use Redis caching for restaurants queries
            const cacheKey = createCacheKey.restaurants(country);
            return await withCache(
                cacheKey,
                async () => {
                    return await prisma.restaurants.findMany({
                        where: whereClause,
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            address: true,
                            city: true,
                            country: true,
                            phone: true,
                            email: true,
                            isActive: true,
                            createdAt: true,
                            menu_items: {
                                where: { isAvailable: true },
                                select: {
                                    id: true,
                                    name: true,
                                    price: true,
                                    category: true,
                                },
                                orderBy: { name: "asc" },
                            },
                        },
                        take: pagination.first,
                        skip: pagination.skip,
                    });
                },
                CACHE_TTL.RESTAURANTS,
            );
        },

        restaurant: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Use Redis caching for individual restaurants with user role-based keys
            const cacheKey = `restaurant:${validatedId}:${context.user.role}`;
            const restaurant = await withCache(
                cacheKey,
                async () => {
                    return await prisma.restaurants.findUnique({
                        where: { id: validatedId },
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            city: true,
                            country: true,
                            phone: true,
                            email: true,
                            isActive: true,
                            createdAt: true,
                            menu_items: {
                                where: { isAvailable: true },
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    price: true,
                                    category: true,
                                    imageUrl: true,
                                },
                                orderBy: { category: "asc" },
                            },
                        },
                    });
                },
                CACHE_TTL.RESTAURANTS,
            );

            if (!restaurant) return null;

            // Check country-based access for non-admin users
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA ||
                    context.user.role === UserRole.MEMBER_INDIA
                ) {
                    if (restaurant.country !== "INDIA") {
                        throw GraphQLErrors.forbidden("Access denied to this restaurant");
                    }
                } else if (
                    context.user.role === UserRole.MANAGER_AMERICA ||
                    context.user.role === UserRole.MEMBER_AMERICA
                ) {
                    if (restaurant.country !== "AMERICA") {
                        throw GraphQLErrors.forbidden("Access denied to this restaurant");
                    }
                }
            }

            return restaurant;
        },
    },

    Mutation: {
        createRestaurant: async (
            _parent: unknown,
            { input }: { input: CreateRestaurantInput },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("Restaurant creation failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                });
                throw GraphQLErrors.forbidden();
            }

            try {
                // Validate input
                const validated = validateInput(CreateRestaurantInputSchema, input);

                const restaurant = await prisma.restaurants.create({
                    data: validated,
                    include: {
                        menu_items: true,
                    },
                });

                logger.info("Restaurant created successfully", {
                    restaurantId: restaurant.id,
                    name: restaurant.name,
                    country: restaurant.country,
                    userId: context.user.id,
                });

                return restaurant;
            } catch (error) {
                logger.error("Restaurant creation failed", {
                    userId: context.user?.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        updateRestaurant: async (
            _parent: unknown,
            { id, input }: { id: string; input: Partial<CreateRestaurantInput> },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            // Validate update input (partial schema)
            const validatedInput = CreateRestaurantInputSchema.partial().parse(input);

            return await prisma.restaurants
                .update({
                    where: { id: validatedId },
                    data: validatedInput,
                    include: {
                        menu_items: true,
                    },
                })
                .then(async (updatedRestaurant) => {
                    // Invalidate cache for the specific restaurant (all role variants) and restaurants list
                    await Promise.all([
                        deleteCacheByPattern(`restaurant:${validatedId}:*`),
                        deleteCacheByPattern("restaurants:*"),
                    ]);
                    return updatedRestaurant;
                });
        },

        deleteRestaurant: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                throw GraphQLErrors.forbidden();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            await prisma.restaurants.delete({
                where: { id: validatedId },
            });

            // Invalidate cache for the specific restaurant (all role variants) and restaurants list
            await Promise.all([
                deleteCacheByPattern(`restaurant:${validatedId}:*`),
                deleteCacheByPattern("restaurants:*"),
            ]);

            return true;
        },
    },

    Restaurant: {
        menuItems: (parent: restaurants & { menu_items: menu_items[] }) => parent.menu_items || [],
        menuCategories: async (parent: restaurants) => {
            // Get distinct categories from menu items for this restaurant
            const categories = await prisma.menu_items.findMany({
                where: { restaurantId: parent.id },
                select: { category: true },
                distinct: ["category"],
            });
            return categories
                .map((item) => item.category)
                .filter((category): category is string => category !== null);
        },
    },
};
