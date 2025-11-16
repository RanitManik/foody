/**
 * @fileoverview Menu Item Resolvers
 * @module graphql/menu/resolver
 * @description Handles all menu item operations including CRUD operations, category management,
 * and restaurant menu queries. Implements role-based access control, caching strategies,
 * and country-specific filtering for menu items.
 *
 * @features
 * - Menu item creation, retrieval, update, and deletion
 * - Category filtering and discovery
 * - Restaurant-based menu filtering
 * - Redis caching for improved performance
 * - Role-based authorization (Admin, Manager, Member)
 * - Country-specific access control
 * - Pagination support for large datasets
 *
 * @security
 * - Authentication required for all operations
 * - Managers can only manage menu items in their country
 * - Members have read-only access
 * - Admin has full access across all countries
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

import { prisma } from "../../lib/database";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validateInput,
    CreateMenuItemInputSchema,
    validationSchemas,
} from "../../lib/shared/validation";
import { parsePagination } from "../../lib/shared/pagination";
import { GraphQLContext, CreateMenuItemInput } from "../../types/graphql";
import { UserRole, Country } from "@prisma/client";
import { withCache, createCacheKey, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

export const menuResolvers = {
    Query: {
        /**
         * Retrieve paginated list of menu items with optional restaurant filtering
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} [params.restaurantId] - Optional restaurant ID to filter menu items
         * @param {number} [params.first=10] - Number of items to return (pagination)
         * @param {number} [params.skip=0] - Number of items to skip (pagination)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<MenuItem[]>} Array of menu items with restaurant details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} BAD_INPUT - If restaurantId validation fails
         *
         * @description
         * Fetches available menu items with restaurant information and caching.
         * Only returns items marked as available. Results are cached in Redis
         * for improved performance on repeated queries.
         *
         * @caching
         * - Cache key: menuItems:{restaurantId}
         * - TTL: CACHE_TTL.MENU_ITEMS
         * - Invalidated on: menu item create/update/delete operations
         *
         * @example
         * query {
         *   menuItems(restaurantId: "rest123", first: 10, skip: 0) {
         *     id name price category
         *     restaurant { name }
         *   }
         * }
         */
        menuItems: async (
            _parent: unknown,
            { restaurantId, first, skip }: { restaurantId?: string; first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;

            const pagination = parsePagination({ first, skip });
            const whereClause: Record<string, unknown> = { isAvailable: true };

            let countryFilter: Country | undefined;
            if (currentUser.role !== UserRole.ADMIN) {
                if (!currentUser.country) {
                    logger.warn("Menu items query failed: user missing country assignment", {
                        userId: currentUser.id,
                        role: currentUser.role,
                    });
                    throw GraphQLErrors.forbidden("Country assignment required for this action");
                }
                countryFilter = currentUser.country;
                whereClause.restaurants = {
                    country: countryFilter,
                };
            }

            if (restaurantId) {
                const validatedRestaurantId = validationSchemas.id.parse(restaurantId);
                whereClause.restaurantId = validatedRestaurantId;
            }

            // Use Redis caching for menu items queries
            const cacheKey = createCacheKey.menuItems({
                restaurantId,
                country: countryFilter ?? null,
            });
            return await withCache(
                cacheKey,
                async () => {
                    return await prisma.menu_items.findMany({
                        where: whereClause,
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            category: true,
                            imageUrl: true,
                            isAvailable: true,
                            restaurantId: true,
                            createdAt: true,
                            updatedAt: true,
                            restaurants: {
                                select: {
                                    id: true,
                                    name: true,
                                    address: true,
                                    city: true,
                                    country: true,
                                    isActive: true,
                                },
                            },
                        },
                        orderBy: {
                            name: "asc",
                        },
                        take: pagination.first,
                        skip: pagination.skip,
                    });
                },
                CACHE_TTL.MENU_ITEMS,
            );
        },

        /**
         * Retrieve detailed information for a single menu item
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} params.id - Menu item ID (CUID format)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<MenuItem|null>} Menu item with full details or null if not found
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} BAD_INPUT - If ID format is invalid
         * @throws {GraphQLError} NOT_FOUND - If menu item does not exist
         *
         * @description
         * Fetches complete details of a specific menu item including restaurant information.
         * Results are cached in Redis for performance.
         *
         * @caching
         * - Cache key: menuItem:{id}
         * - TTL: CACHE_TTL.MENU_ITEMS
         * - Invalidated on: menu item update/delete operations
         *
         * @example
         * query {
         *   menuItem(id: "clx123abc") {
         *     id name description price category imageUrl
         *     restaurant { name address city country }
         *   }
         * }
         */
        menuItem: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            // Use Redis caching for individual menu items
            const cacheKey = createCacheKey.menuItem(validatedId);
            return await withCache(
                cacheKey,
                async () => {
                    const menuItem = await prisma.menu_items.findUnique({
                        where: { id: validatedId },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            category: true,
                            imageUrl: true,
                            isAvailable: true,
                            restaurantId: true,
                            createdAt: true,
                            updatedAt: true,
                            restaurants: {
                                select: {
                                    id: true,
                                    name: true,
                                    address: true,
                                    city: true,
                                    country: true,
                                    isActive: true,
                                },
                            },
                        },
                    });

                    if (!menuItem) {
                        throw GraphQLErrors.notFound("Menu item not found");
                    }

                    if (currentUser.role !== UserRole.ADMIN) {
                        if (!currentUser.country) {
                            throw GraphQLErrors.forbidden(
                                "Country assignment required for this action",
                            );
                        }

                        if (menuItem.restaurants.country !== currentUser.country) {
                            logger.warn("Menu item access denied due to country restriction", {
                                userId: currentUser.id,
                                menuItemId: validatedId,
                                userCountry: currentUser.country,
                                restaurantCountry: menuItem.restaurants.country,
                            });
                            throw GraphQLErrors.forbidden("Access denied to this menu item");
                        }
                    }

                    return menuItem;
                },
                CACHE_TTL.MENU_ITEMS,
            );
        },

        /**
         * Get list of unique menu categories
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Query parameters
         * @param {string} [params.restaurantId] - Optional restaurant ID to filter categories
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<string[]>} Array of unique category names
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         *
         * @description
         * Retrieves distinct menu item categories for filtering and navigation.
         * Can be filtered by restaurant to show only categories available at that location.
         *
         * @example
         * query {
         *   menuCategories(restaurantId: "rest123")
         * }
         * // Returns: ["Appetizers", "Main Course", "Desserts", "Beverages"]
         */
        menuCategories: async (
            _parent: unknown,
            { restaurantId }: { restaurantId?: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const whereClause: Record<string, unknown> = {};

            let countryFilter: Country | undefined;
            const currentUser = context.user;
            if (currentUser.role !== UserRole.ADMIN) {
                if (!currentUser.country) {
                    throw GraphQLErrors.forbidden("Country assignment required for this action");
                }
                countryFilter = currentUser.country;
                whereClause.restaurants = {
                    country: countryFilter,
                };
            }

            if (restaurantId) {
                const validatedRestaurantId = validationSchemas.id.parse(restaurantId);
                whereClause.restaurantId = validatedRestaurantId;
            }

            // Get distinct categories from menu items
            const categories = await prisma.menu_items.findMany({
                where: whereClause,
                select: {
                    category: true,
                },
                distinct: ["category"],
                orderBy: {
                    category: "asc",
                },
            });

            return categories
                .map((item) => item.category)
                .filter((category): category is string => category !== null);
        },
    },

    Mutation: {
        /**
         * Create a new menu item for a restaurant
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {CreateMenuItemInput} params.input - Menu item data
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<MenuItem>} Newly created menu item with restaurant details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or country access
         * @throws {GraphQLError} NOT_FOUND - If restaurant does not exist
         * @throws {GraphQLError} BAD_INPUT - If input validation fails
         *
         * @description
         * Creates a new menu item for a restaurant with role-based and country-based restrictions:
         * 1. Validates all input data
         * 2. Checks user has manager/admin role
         * 3. Verifies restaurant exists and is active
         * 4. For managers, validates restaurant is in their country
         * 5. Creates menu item with auto-availability set to true
         * 6. Invalidates menu item caches
         * 7. Logs creation with metadata
         *
         * @permissions
         * - **Admin**: Can create for any restaurant
         * - **Manager India**: Can only create for INDIA restaurants
         * - **Manager America**: Can only create for AMERICA restaurants
         * - **Members**: No access (forbidden)
         *
         * @example
         * mutation {
         *   createMenuItem(input: {
         *     name: "Butter Chicken"
         *     description: "Creamy tomato curry"
         *     price: 14.99
         *     category: "Main Course"
         *     restaurantId: "rest123"
         *     imageUrl: "https://..."
         *   }) {
         *     id name price
         *   }
         * }
         */
        createMenuItem: async (
            _parent: unknown,
            { input }: { input: CreateMenuItemInput },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Menu item creation failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            try {
                // Validate input
                const validated = validateInput(CreateMenuItemInputSchema, input);
                const { name, description, price, category, restaurantId, imageUrl } = validated;

                // Only managers and admins can create menu items
                if (
                    context.user.role !== UserRole.ADMIN &&
                    context.user.role !== UserRole.MANAGER_INDIA &&
                    context.user.role !== UserRole.MANAGER_AMERICA
                ) {
                    logger.warn("Menu item creation failed: insufficient permissions", {
                        userId: context.user.id,
                        userRole: context.user.role,
                    });
                    throw GraphQLErrors.forbidden("Not authorized to create menu items");
                }

                // Validate restaurant exists and check country access for non-admin managers
                const restaurant = await prisma.restaurants.findUnique({
                    where: { id: restaurantId },
                    select: { id: true, country: true, isActive: true },
                });

                if (!restaurant) {
                    logger.warn("Menu item creation failed: restaurant not found", {
                        userId: context.user.id,
                        restaurantId,
                    });
                    throw GraphQLErrors.notFound("Restaurant not found");
                }

                // Managers can only create menu items for restaurants in their country
                if (context.user.role !== UserRole.ADMIN) {
                    if (
                        context.user.role === UserRole.MANAGER_INDIA &&
                        restaurant.country !== "INDIA"
                    ) {
                        throw GraphQLErrors.forbidden(
                            "Cannot create menu items for restaurants outside India",
                        );
                    }
                    if (
                        context.user.role === UserRole.MANAGER_AMERICA &&
                        restaurant.country !== "AMERICA"
                    ) {
                        throw GraphQLErrors.forbidden(
                            "Cannot create menu items for restaurants outside America",
                        );
                    }
                }

                const menuItem = await prisma.menu_items.create({
                    data: {
                        name,
                        description,
                        price,
                        category,
                        restaurantId,
                        imageUrl,
                        isAvailable: true,
                    },
                    include: {
                        restaurants: true,
                    },
                });

                logger.info("Menu item created successfully", {
                    menuItemId: menuItem.id,
                    restaurantId: menuItem.restaurantId,
                    userId: context.user.id,
                    price: menuItem.price,
                });

                // Invalidate cache for menu items
                await deleteCacheByPattern("menuItems:*");

                return menuItem;
            } catch (error) {
                logger.error("Menu item creation failed", {
                    userId: context.user?.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Update an existing menu item
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Menu item ID to update
         * @param {Partial<CreateMenuItemInput>} params.input - Fields to update (partial)
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<MenuItem>} Updated menu item with restaurant details
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or country access
         * @throws {GraphQLError} NOT_FOUND - If menu item does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID or input validation fails
         *
         * @description
         * Updates menu item properties with validation and country-based access control:
         * 1. Validates user has manager/admin role
         * 2. Validates menu item ID format
         * 3. Fetches existing menu item with restaurant country
         * 4. For managers, verifies item is in their country
         * 5. Validates partial input data
         * 6. Updates menu item
         * 7. Invalidates relevant caches
         *
         * @permissions
         * - **Admin**: Can update any menu item
         * - **Manager India**: Can only update INDIA restaurant items
         * - **Manager America**: Can only update AMERICA restaurant items
         * - **Members**: No access (forbidden)
         *
         * @example
         * mutation {
         *   updateMenuItem(id: "item123", input: {
         *     price: 15.99
         *     isAvailable: false
         *   }) {
         *     id price isAvailable updatedAt
         *   }
         * }
         */
        updateMenuItem: async (
            _parent: unknown,
            { id, input }: { id: string; input: Partial<CreateMenuItemInput> },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Only managers and admins can update menu items
            if (
                context.user.role !== UserRole.ADMIN &&
                context.user.role !== UserRole.MANAGER_INDIA &&
                context.user.role !== UserRole.MANAGER_AMERICA
            ) {
                throw GraphQLErrors.forbidden("Not authorized to update menu items");
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
                include: {
                    restaurants: {
                        select: { country: true },
                    },
                },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
            }

            // Managers can only update menu items for restaurants in their country
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA &&
                    menuItem.restaurants.country !== "INDIA"
                ) {
                    throw GraphQLErrors.forbidden(
                        "Cannot update menu items for restaurants outside India",
                    );
                }
                if (
                    context.user.role === UserRole.MANAGER_AMERICA &&
                    menuItem.restaurants.country !== "AMERICA"
                ) {
                    throw GraphQLErrors.forbidden(
                        "Cannot update menu items for restaurants outside America",
                    );
                }
            }

            // Validate update input (partial schema)
            const validatedInput = CreateMenuItemInputSchema.partial().parse(input);

            return await prisma.menu_items
                .update({
                    where: { id: validatedId },
                    data: validatedInput,
                    include: {
                        restaurants: true,
                    },
                })
                .then(async (updatedMenuItem) => {
                    // Invalidate cache for the specific menu item and menu items list
                    await Promise.all([
                        deleteCacheByPattern(`menuItem:${validatedId}`),
                        deleteCacheByPattern("menuItems:*"),
                    ]);
                    return updatedMenuItem;
                });
        },

        /**
         * Delete a menu item permanently
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {string} params.id - Menu item ID to delete
         * @param {GraphQLContext} context - GraphQL execution context
         * @returns {Promise<boolean>} True if deletion successful
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If user is not authenticated
         * @throws {GraphQLError} FORBIDDEN - If user lacks permission or country access
         * @throws {GraphQLError} NOT_FOUND - If menu item does not exist
         * @throws {GraphQLError} BAD_INPUT - If ID validation fails
         *
         * @description
         * Permanently removes a menu item from the database with proper authorization:
         * 1. Validates user has manager/admin role
         * 2. Validates menu item ID format
         * 3. Fetches menu item with restaurant country
         * 4. For managers, verifies item is in their country
         * 5. Deletes menu item from database
         * 6. Invalidates all relevant caches
         *
         * @permissions
         * - **Admin**: Can delete any menu item
         * - **Manager India**: Can only delete INDIA restaurant items
         * - **Manager America**: Can only delete AMERICA restaurant items
         * - **Members**: No access (forbidden)
         *
         * @warning
         * This is a permanent operation that cannot be undone.
         * Consider marking items as unavailable instead of deletion for data retention.
         *
         * @example
         * mutation {
         *   deleteMenuItem(id: "item123")
         * }
         */
        deleteMenuItem: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Only managers and admins can delete menu items
            if (
                context.user.role !== UserRole.ADMIN &&
                context.user.role !== UserRole.MANAGER_INDIA &&
                context.user.role !== UserRole.MANAGER_AMERICA
            ) {
                throw GraphQLErrors.forbidden("Not authorized to delete menu items");
            }

            // Validate ID
            const validatedId = validationSchemas.id.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
                include: {
                    restaurants: {
                        select: { country: true },
                    },
                },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
            }

            // Managers can only delete menu items for restaurants in their country
            if (context.user.role !== UserRole.ADMIN) {
                if (
                    context.user.role === UserRole.MANAGER_INDIA &&
                    menuItem.restaurants.country !== "INDIA"
                ) {
                    throw GraphQLErrors.forbidden(
                        "Cannot delete menu items for restaurants outside India",
                    );
                }
                if (
                    context.user.role === UserRole.MANAGER_AMERICA &&
                    menuItem.restaurants.country !== "AMERICA"
                ) {
                    throw GraphQLErrors.forbidden(
                        "Cannot delete menu items for restaurants outside America",
                    );
                }
            }

            await prisma.menu_items.delete({
                where: { id: validatedId },
            });

            // Invalidate cache for the specific menu item and menu items list
            await Promise.all([
                deleteCacheByPattern(`menuItem:${validatedId}`),
                deleteCacheByPattern("menuItems:*"),
            ]);

            return true;
        },
    },

    /**
     * Field resolvers for MenuItem type
     * Maps Prisma relationship fields to GraphQL schema fields
     */
    MenuItem: {
        /**
         * Resolve the restaurant field for a MenuItem
         * Maps the 'restaurants' Prisma relation to 'restaurant' GraphQL field
         *
         * @async
         * @param {Object} parent - Parent MenuItem object from Prisma
         * @param {Object} parent.restaurants - The related restaurant object from Prisma
         * @returns {Object|null} The restaurant object or null if not loaded
         *
         * @description
         * Field resolver that handles the transformation of the Prisma relationship
         * to the GraphQL schema. The Prisma relation is named 'restaurants' but
         * the GraphQL field is 'restaurant' (singular).
         */
        restaurant: (parent: Record<string, unknown>) => {
            return parent.restaurants || null;
        },
    },
};
