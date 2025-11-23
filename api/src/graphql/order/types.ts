// Order-specific GraphQL types and interfaces

export interface Order {
    id: string;
    status: string;
    totalAmount: number;
    phone: string;
    specialInstructions?: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    notes?: string;
}

export interface CreateOrderInput {
    items: Array<{
        menuItemId: string;
        quantity: number;
        notes?: string;
    }>;
    phone: string;
    specialInstructions?: string;
    paymentMethodId?: string;
}
