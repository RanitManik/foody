// User-specific GraphQL types and interfaces

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    country?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    isActive?: boolean;
}
