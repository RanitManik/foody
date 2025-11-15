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

export const menuResolvers = {
    Query: {
        menuItems: async (
            _parent: unknown,
            { restaurantId, first, skip }: { restaurantId?: string; first?: number; skip?: number },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const pagination = parsePagination({ first, skip });
            const whereClause: Record<string, unknown> = { isAvailable: true };

            if (restaurantId) {
                const validatedRestaurantId = validationSchemas.cuid.parse(restaurantId);
                whereClause.restaurantId = validatedRestaurantId;
            }

            // Use Redis caching for menu items queries
            const cacheKey = createCacheKey.menuItems(restaurantId);
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

        menuItem: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

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

                    return menuItem;
                },
                CACHE_TTL.MENU_ITEMS,
            );
        },

        menuCategories: async (
            _parent: unknown,
            { restaurantId }: { restaurantId?: string },
            context: GraphQLContext,
        ) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            const whereClause: Record<string, unknown> = {};

            if (restaurantId) {
                whereClause.restaurantId = restaurantId;
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
            const validatedId = validationSchemas.cuid.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
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
            const validatedId = validationSchemas.cuid.parse(id);

            const menuItem = await prisma.menu_items.findUnique({
                where: { id: validatedId },
            });

            if (!menuItem) {
                throw GraphQLErrors.notFound("Menu item not found");
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
};
