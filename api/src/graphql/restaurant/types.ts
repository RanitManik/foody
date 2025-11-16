// Restaurant-specific GraphQL types and interfaces
export interface Restaurant {
    id: string;
    name: string;
    description?: string;
    address: string;
    phone?: string;
    email?: string;
    imageUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRestaurantInput {
    name: string;
    description?: string;
    address: string;
    city: string;
    location: string;
    phone?: string;
    email?: string;
}
