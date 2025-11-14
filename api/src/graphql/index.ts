// Main GraphQL exports - combines all domains
import { mergeTypeDefs } from "@graphql-tools/merge";
import { mergeResolvers } from "@graphql-tools/merge";

// Import scalar definitions and resolvers
import { scalarTypeDefs, scalarResolvers } from "./scalars";

// Import all domain modules directly from their files
import { typeDefs as authTypeDefs } from "./auth/schema";
import { authResolvers } from "./auth/resolver";
import { typeDefs as menuTypeDefs } from "./menu/schema";
import { menuResolvers } from "./menu/resolver";
import { typeDefs as orderTypeDefs } from "./order/schema";
import { orderResolvers } from "./order/resolver";
import { typeDefs as paymentTypeDefs } from "./payment/schema";
import { paymentResolvers } from "./payment/resolver";
import { typeDefs as restaurantTypeDefs } from "./restaurant/schema";
import { restaurantResolvers } from "./restaurant/resolver";
import { typeDefs as userTypeDefs } from "./user/schema";
import { userResolvers } from "./user/resolver";

// Merge all type definitions
export const typeDefs = mergeTypeDefs([
    scalarTypeDefs,
    authTypeDefs,
    menuTypeDefs,
    orderTypeDefs,
    paymentTypeDefs,
    restaurantTypeDefs,
    userTypeDefs,
]);

// Merge all resolvers (scalars must come first)
export const resolvers = mergeResolvers([
    scalarResolvers,
    authResolvers,
    menuResolvers,
    orderResolvers,
    paymentResolvers,
    restaurantResolvers,
    userResolvers,
]);
