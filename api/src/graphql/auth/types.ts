// Auth-specific GraphQL types and interfaces
import { UserRole, Country } from "@prisma/client";

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
    country?: Country;
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
    country?: Country;
}

export interface LoginInput {
    email: string;
    password: string;
}
