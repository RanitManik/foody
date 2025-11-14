// Menu-specific GraphQL types and interfaces
// These are generated from the GraphQL schema and used in resolvers

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
    category?: string;
    restaurantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateMenuItemInput {
    name: string;
    description?: string;
    price: number;
    category: string;
    imageUrl?: string;
    restaurantId: string;
}
