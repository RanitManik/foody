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

export const restaurantResolvers = {
    Query: {
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

            return await prisma.restaurants.findMany({
                where: whereClause,
                include: {
                    menu_items: true,
                },
                take: pagination.first,
                skip: pagination.skip,
            });
        },

        restaurant: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }

            // Validate ID
            const validatedId = validationSchemas.cuid.parse(id);

            const restaurant = await prisma.restaurants.findUnique({
                where: { id: validatedId },
                include: {
                    menu_items: true,
                },
            });

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

            return await prisma.restaurants.update({
                where: { id: validatedId },
                data: validatedInput,
                include: {
                    menu_items: true,
                },
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
