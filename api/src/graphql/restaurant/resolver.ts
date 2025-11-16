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

            const effectiveCountry =
                typeof whereClause.country === "string" ? (whereClause.country as string) : country;

            // Use Redis caching for restaurants queries
            const cacheKey = createCacheKey.restaurants({ country: effectiveCountry ?? null });
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
                            updatedAt: true,
                            menu_items: {
                                where: { isAvailable: true },
                                select: {
                                    id: true,
                                    name: true,
                                    price: true,
                                    isAvailable: true,
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
            const validatedId = validationSchemas.id.parse(id);

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
                            description: true,
                            address: true,
                            city: true,
                            country: true,
                            phone: true,
                            email: true,
                            isActive: true,
                            createdAt: true,
                            updatedAt: true,
                            menu_items: {
                                where: { isAvailable: true },
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    price: true,
                                    isAvailable: true,
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
        /**
         * Create a new restaurant (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {CreateRestaurantInput} params.input - Restaurant data including name, country, address
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Restaurant>} Newly created restaurant with menu items
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} BAD_INPUT - If input validation fails
         *
         * @description
         * Creates a new restaurant in the system with the following workflow:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates all input data including country, address, and contact info
         * 3. Creates restaurant record in database
         * 4. Invalidates restaurant list caches
         * 5. Logs creation with restaurant metadata
         *
         * @permissions
         * - **Admin**: Full access to create restaurants in any country
         * - **Others**: Forbidden
         *
         * @businessLogic
         * - Restaurants can be created in INDIA or AMERICA countries
         * - New restaurants default to isActive: true
         * - Menu items can be added after restaurant creation
         *
         * @example
         * mutation {
         *   createRestaurant(input: {
         *     name: "Taste of Mumbai"
         *     description: "Authentic Indian cuisine"
         *     address: "123 Main St, Mumbai 400001"
         *     city: "Mumbai"
         *     country: INDIA
         *     phone: "+91-9876543210"
         *     email: "info@tasteindia.com"
         *   }) {
         *     id name city country isActive
         *   }
         * }
         */
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
                throw GraphQLErrors.forbidden("Admin access required to create restaurants");
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

                // Invalidate cache for restaurants list
                await deleteCacheByPattern("restaurants:*");

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

        /**
         * Update an existing restaurant (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Restaurant ID to update (CUID format)
         * @param {Partial<CreateRestaurantInput>} params.input - Fields to update (partial)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<Restaurant>} Updated restaurant with menu items
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If restaurant does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID or input validation fails
         *
         * @description
         * Updates restaurant properties with validation and comprehensive logging:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates restaurant ID format
         * 3. Validates partial input data (schema allows any subset of fields)
         * 4. Updates restaurant record in database
         * 5. Invalidates restaurant-specific caches and list caches
         * 6. Returns updated restaurant with all details
         *
         * @permissions
         * - **Admin**: Can update any restaurant property
         * - **Others**: Forbidden
         *
         * @updatableFields
         * - name, description, address, city, country
         * - phone, email, isActive
         * Can update any combination of these fields
         *
         * @caching
         * Cache invalidation pattern:
         * - restaurant:{restaurantId}:* (all role-specific views)
         * - restaurants:* (all list views)
         *
         * @example
         * mutation {
         *   updateRestaurant(id: "rest123", input: {
         *     isActive: false
         *     phone: "+91-9876543210"
         *   }) {
         *     id name isActive updatedAt
         *   }
         * }
         */
        updateRestaurant: async (
            _parent: unknown,
            { id, input }: { id: string; input: Partial<CreateRestaurantInput> },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("Restaurant update failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                    restaurantId: id,
                });
                throw GraphQLErrors.forbidden("Admin access required to update restaurants");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

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
                        logger.info("Restaurant updated successfully", {
                            restaurantId: updatedRestaurant.id,
                            name: updatedRestaurant.name,
                            userId: context.user?.id,
                        });

                        // Invalidate cache for the specific restaurant (all role variants) and restaurants list
                        await Promise.all([
                            deleteCacheByPattern(`restaurant:${validatedId}:*`),
                            deleteCacheByPattern("restaurants:*"),
                        ]);
                        return updatedRestaurant;
                    });
            } catch (error) {
                logger.error("Restaurant update failed", {
                    userId: context.user?.id,
                    restaurantId: id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Delete a restaurant permanently (Admin only)
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Restaurant ID to delete
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<boolean>} True if deletion successful
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user is not admin
         * @throws {GraphQLError} NOT_FOUND - If restaurant does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Permanently removes a restaurant and all associated data:
         * 1. Validates user is authenticated and has ADMIN role
         * 2. Validates restaurant ID format
         * 3. Deletes restaurant from database (cascade deletes menu items and orders)
         * 4. Invalidates all restaurant-related caches
         * 5. Logs deletion with restaurant metadata
         *
         * @permissions
         * - **Admin**: Can delete any restaurant
         * - **Others**: Forbidden
         *
         * @cascadeDelete
         * Due to database schema with CASCADE constraints:
         * - All menu_items for this restaurant are deleted
         * - All order_items referencing menu items are deleted
         * - All orders become orphaned (consider soft delete in production)
         *
         * @warning
         * This is a permanent operation that cannot be undone.
         * In production, consider using soft delete (isActive: false) instead.
         *
         * @productionRecommendation
         * Replace permanent deletion with:
         * - updateRestaurant(id, { isActive: false })
         * - Keep historical data for auditing and analytics
         *
         * @example
         * mutation {
         *   deleteRestaurant(id: "rest123")
         * }
         */
        deleteRestaurant: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user || context.user.role !== UserRole.ADMIN) {
                logger.warn("Restaurant deletion failed: access denied", {
                    userId: context.user?.id,
                    userRole: context.user?.role,
                    restaurantId: id,
                });
                throw GraphQLErrors.forbidden("Admin access required to delete restaurants");
            }

            try {
                // Validate ID
                const validatedId = validationSchemas.id.parse(id);

                // Check restaurant exists before deletion
                const restaurant = await prisma.restaurants.findUnique({
                    where: { id: validatedId },
                    select: { id: true, name: true },
                });

                if (!restaurant) {
                    throw GraphQLErrors.notFound("Restaurant not found");
                }

                await prisma.restaurants.delete({
                    where: { id: validatedId },
                });

                logger.info("Restaurant deleted successfully", {
                    restaurantId: validatedId,
                    restaurantName: restaurant.name,
                    userId: context.user.id,
                });

                // Invalidate cache for the specific restaurant (all role variants) and restaurants list
                await Promise.all([
                    deleteCacheByPattern(`restaurant:${validatedId}:*`),
                    deleteCacheByPattern("restaurants:*"),
                ]);

                return true;
            } catch (error) {
                logger.error("Restaurant deletion failed", {
                    userId: context.user?.id,
                    restaurantId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
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
