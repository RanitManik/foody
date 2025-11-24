// User-specific GraphQL types and interfaces

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    restaurantId?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    restaurantId?: string;
    isActive?: boolean;
}

export interface UpdateUserInput {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    restaurantId?: string | null;
    isActive?: boolean;
}
