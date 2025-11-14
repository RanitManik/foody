// Payment-specific GraphQL types and interfaces

export interface Payment {
    id: string;
    amount: number;
    status: string;
    method: string;
    orderId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentMethod {
    id: string;
    type: string;
    provider: string;
    lastFour?: string;
    isDefault: boolean;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentMethodInput {
    type: string;
    provider: string;
    token: string;
}

export interface CreatePaymentInput {
    orderId: string;
    paymentMethodId: string;
    amount: number;
}
