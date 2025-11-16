/**
 * @fileoverview Menu Item Resolvers
 * @module graphql/menu/resolver
 * @description Handles all menu item operations including CRUD operations, category management,
 * and restaurant menu queries. Implements role-based access control, caching strategies,
 * and location-scoped filtering for menu items.
 *
 * @features
 * - Menu item creation, retrieval, update, and deletion
 * - Category filtering and discovery
 * - Restaurant-based menu filtering
 * - Redis caching for improved performance
 * - Role-based authorization (Admin, Manager, Member)
 * - Location-specific access control
 * - Pagination support for large datasets
 *
 * @security
 * - Authentication required for all operations
 * - Managers can only manage menu items within their assigned location
 * - Members have read-only access
 * - Admin has full access across all locations
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
import { UserRole } from "@prisma/client";
import { withCache, createCacheKey, CACHE_TTL, deleteCacheByPattern } from "../../lib/shared/cache";

const requireAssignedLocation = (user: NonNullable<GraphQLContext["user"]>): string => {
    if (!user.assignedLocation) {
        logger.warn("Location assignment missing for location-scoped operation", {
            userId: user.id,
            role: user.role,
        });
        throw GraphQLErrors.forbidden("Location assignment required for this action");
    }

    return user.assignedLocation;
};

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
            const isAdmin = currentUser.role === UserRole.ADMIN;

            const pagination = parsePagination({ first, skip });
            const whereClause: Record<string, unknown> = { isAvailable: true };

            let locationFilter: string | null = null;
            if (!isAdmin) {
                const assignedLocation = requireAssignedLocation(currentUser);
                locationFilter = assignedLocation;
                whereClause.restaurants = {
                    location: assignedLocation,
                };
            }

            if (restaurantId) {
                const validatedRestaurantId = validationSchemas.id.parse(restaurantId);
                whereClause.restaurantId = validatedRestaurantId;
            }

            const cacheKey = createCacheKey.menuItems({
                restaurantId,
                location: locationFilter,
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
                                    location: true,
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
         *     restaurant { name address city location }
         *   }
         * }
         */
        menuItem: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;

            const validatedId = validationSchemas.id.parse(id);

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
                                    location: true,
                                    isActive: true,
                                },
                            },
                        },
                    });

                    if (!menuItem) {
                        throw GraphQLErrors.notFound("Menu item not found");
                    }

                    if (!isAdmin) {
                        const assignedLocation = requireAssignedLocation(currentUser);
                        if (menuItem.restaurants?.location !== assignedLocation) {
                            logger.warn("Menu item access denied due to location restriction", {
                                userId: currentUser.id,
                                menuItemId: validatedId,
                                userLocation: assignedLocation,
                                restaurantLocation: menuItem.restaurants?.location,
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
            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;

            if (!isAdmin) {
                const assignedLocation = requireAssignedLocation(currentUser);
                whereClause.restaurants = {
                    location: assignedLocation,
                };
            }

            if (restaurantId) {
                const validatedRestaurantId = validationSchemas.id.parse(restaurantId);
                whereClause.restaurantId = validatedRestaurantId;
            }

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
        createMenuItem: async (
            _parent: unknown,
            { input }: { input: CreateMenuItemInput },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                logger.warn("Menu item creation failed: not authenticated");
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                logger.warn("Menu item creation failed: insufficient permissions", {
                    userId: currentUser.id,
                    userRole: currentUser.role,
                });
                throw GraphQLErrors.forbidden("Not authorized to create menu items");
            }

            try {
                const validated = validateInput(CreateMenuItemInputSchema, input);
                const { name, description, price, category, restaurantId, imageUrl } = validated;

                const restaurant = await prisma.restaurants.findUnique({
                    where: { id: restaurantId },
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        isActive: true,
                    },
                });

                if (!restaurant) {
                    logger.warn("Menu item creation failed: restaurant not found", {
                        userId: currentUser.id,
                        restaurantId,
                    });
                    throw GraphQLErrors.notFound("Restaurant not found");
                }

                if (!isAdmin) {
                    const assignedLocation = requireAssignedLocation(currentUser);
                    if (restaurant.location !== assignedLocation) {
                        logger.warn("Menu item creation forbidden: location mismatch", {
                            userId: currentUser.id,
                            userLocation: assignedLocation,
                            restaurantLocation: restaurant.location,
                        });
                        throw GraphQLErrors.forbidden(
                            "Cannot manage menu items outside assigned location",
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
                        restaurants: {
                            select: {
                                id: true,
                                name: true,
                                location: true,
                            },
                        },
                    },
                });

                logger.info("Menu item created successfully", {
                    menuItemId: menuItem.id,
                    restaurantId: menuItem.restaurantId,
                    userId: currentUser.id,
                    price: menuItem.price,
                });

                await deleteCacheByPattern("menuItems:*");

                return menuItem;
            } catch (error) {
                logger.error("Menu item creation failed", {
                    userId: currentUser.id,
                    input,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        updateMenuItem: async (
            _parent: unknown,
            { id, input }: { id: string; input: Partial<CreateMenuItemInput> },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                throw GraphQLErrors.forbidden("Not authorized to update menu items");
            }

            const validatedId = validationSchemas.id.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
                include: {
                    restaurants: {
                        select: {
                            id: true,
                            location: true,
                        },
                    },
                },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
            }

            if (!isAdmin) {
                const assignedLocation = requireAssignedLocation(currentUser);
                if (menuItem.restaurants?.location !== assignedLocation) {
                    throw GraphQLErrors.forbidden(
                        "Cannot manage menu items outside assigned location",
                    );
                }
            }

            const validatedInput = CreateMenuItemInputSchema.partial().parse(input);

            if (
                validatedInput.restaurantId &&
                validatedInput.restaurantId !== menuItem.restaurantId
            ) {
                const targetRestaurant = await prisma.restaurants.findUnique({
                    where: { id: validatedInput.restaurantId },
                    select: {
                        id: true,
                        location: true,
                    },
                });

                if (!targetRestaurant) {
                    throw GraphQLErrors.badInput("Target restaurant not found");
                }

                if (!isAdmin) {
                    const assignedLocation = requireAssignedLocation(currentUser);
                    if (targetRestaurant.location !== assignedLocation) {
                        throw GraphQLErrors.forbidden(
                            "Cannot move menu item outside assigned location",
                        );
                    }
                }
            }

            const updatedMenuItem = await prisma.menu_items.update({
                where: { id: validatedId },
                data: validatedInput,
                include: {
                    restaurants: {
                        select: {
                            id: true,
                            name: true,
                            location: true,
                        },
                    },
                },
            });

            await Promise.all([
                deleteCacheByPattern(`menuItem:${validatedId}`),
                deleteCacheByPattern("menuItems:*"),
            ]);

            return updatedMenuItem;
        },

        deleteMenuItem: async (
            _parent: unknown,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const currentUser = context.user;
            const isAdmin = currentUser.role === UserRole.ADMIN;
            const isManager = currentUser.role === UserRole.MANAGER;

            if (!isAdmin && !isManager) {
                throw GraphQLErrors.forbidden("Not authorized to delete menu items");
            }

            const validatedId = validationSchemas.id.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
                include: {
                    restaurants: {
                        select: {
                            id: true,
                            location: true,
                        },
                    },
                },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
            }

            if (!isAdmin) {
                const assignedLocation = requireAssignedLocation(currentUser);
                if (menuItem.restaurants?.location !== assignedLocation) {
                    throw GraphQLErrors.forbidden(
                        "Cannot manage menu items outside assigned location",
                    );
                }
            }

            await prisma.menu_items.delete({
                where: { id: validatedId },
            });

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
