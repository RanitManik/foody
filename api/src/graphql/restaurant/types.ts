// Restaurant-specific GraphQL types and interfaces
import { Country } from "@prisma/client";

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
    country: Country;
    phone?: string;
    email?: string;
}
