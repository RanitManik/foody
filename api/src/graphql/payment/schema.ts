// Payment GraphQL schema definitions
export const typeDefs = `#graphql
    type Payment {
        id: ID!
        amount: Decimal!
        status: PaymentStatus!
        method: PaymentMethod!
        order: Order!
        transactionId: String
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type PaymentMethod {
        id: ID!
        type: PaymentType!
        provider: PaymentProvider!
        last4: String
        isDefault: Boolean!
        user: User!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input CreatePaymentMethodInput {
        type: PaymentType!
        provider: PaymentProvider!
        token: String!
    }

    input UpdatePaymentMethodInput {
        isDefault: Boolean
    }

    input ProcessPaymentInput {
        orderId: ID!
        paymentMethodId: ID!
        amount: Decimal!
    }

    enum PaymentStatus {
        PENDING
        PROCESSING
        COMPLETED
        FAILED
        REFUNDED
    }

    enum PaymentType {
        CREDIT_CARD
        DEBIT_CARD
        PAYPAL
        APPLE_PAY
        GOOGLE_PAY
    }

    enum PaymentProvider {
        STRIPE
        PAYPAL
        SQUARE
    }

    type Query {
        paymentMethods: [PaymentMethod!]!
        paymentMethod(id: ID!): PaymentMethod
        payments: [Payment!]!
        payment(id: ID!): Payment
    }

    type Mutation {
        createPaymentMethod(input: CreatePaymentMethodInput!): PaymentMethod!
        updatePaymentMethod(id: ID!, input: UpdatePaymentMethodInput!): PaymentMethod!
        deletePaymentMethod(id: ID!): Boolean!
        processPayment(input: ProcessPaymentInput!): Payment!
    }
`;
