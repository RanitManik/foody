// Auth-specific GraphQL types and interfaces
import { UserRole } from "@prisma/client";

export interface AuthPayload {
    token: string;
    user: User;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    restaurantId?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    restaurantId?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}
