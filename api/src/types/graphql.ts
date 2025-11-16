import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { users as User } from "@prisma/client";

// Import types from GraphQL folder modules
import type { AuthPayload, RegisterInput, LoginInput } from "../graphql/auth/types";
import type { MenuItem, CreateMenuItemInput } from "../graphql/menu/types";
import type { Restaurant, CreateRestaurantInput } from "../graphql/restaurant/types";
import type { Order, OrderItem, CreateOrderInput } from "../graphql/order/types";
import type { PaymentMethod, Payment, CreatePaymentMethodInput } from "../graphql/payment/types";

export interface GraphQLContext {
    req?: Request;
    res?: Response;
    prisma: PrismaClient;
    user: User | null;
    requestId?: string;
    sessionId?: string; // For WebSocket connections
}

export interface AuthUser extends User {
    id: string;
    email: string;
    role: User["role"];
    assignedLocation: User["assignedLocation"];
}

// GraphQL Scalars
export type DateTime = string;
export type Decimal = number;

// Re-export types from GraphQL modules
export type {
    // Auth types
    AuthPayload,
    RegisterInput,
    LoginInput,

    // Menu types
    MenuItem,
    CreateMenuItemInput,

    // Restaurant types
    Restaurant,
    CreateRestaurantInput,

    // Order types
    Order,
    OrderItem,
    CreateOrderInput,

    // Payment types
    PaymentMethod,
    Payment,
    CreatePaymentMethodInput,
};
