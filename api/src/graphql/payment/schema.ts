// Payment GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a payment transaction for an order.
    """
    type Payment {
        "Unique identifier for the payment"
        id: ID!
        "Amount of the payment"
        amount: Decimal!
        "Current status of the payment"
        status: PaymentStatus!
        "Payment method used for this payment"
        method: PaymentMethod!
        "Order this payment is associated with"
        order: Order!
        "External transaction ID from payment processor"
        transactionId: String
        "Timestamp when the payment was created"
        createdAt: DateTime!
        "Timestamp when the payment was last updated"
        updatedAt: DateTime!
    }

    """
    Represents a stored payment method for a restaurant.
    """
    type PaymentMethod {
        "Unique identifier for the payment method"
        id: ID!
        "Type of payment method (credit card, PayPal, etc.)"
        type: PaymentType!
        "Payment provider (Stripe, PayPal, etc.)"
        provider: PaymentProvider!
        "Last 4 digits of the payment method (for cards)"
        last4: String
        "Whether this is the restaurant's default payment method"
        isDefault: Boolean!
        "Restaurant that owns this payment method"
        restaurant: Restaurant!
        "Timestamp when the payment method was created"
        createdAt: DateTime!
        "Timestamp when the payment method was last updated"
        updatedAt: DateTime!
    }

    """
    Input for creating a new payment method.
    """
    input CreatePaymentMethodInput {
        "Type of payment method to create"
        type: PaymentType!
        "Payment provider to use"
        provider: PaymentProvider!
        "Token from payment processor (Stripe, PayPal, etc.)"
        token: String!
    }

    """
    Input for updating an existing payment method.
    """
    input UpdatePaymentMethodInput {
        "Whether to set this as the default payment method"
        isDefault: Boolean
    }

    """
    Input for processing a payment for an order.
    """
    input ProcessPaymentInput {
        "ID of the order to pay for"
        orderId: ID!
        "ID of the payment method to use"
        paymentMethodId: ID!
        "Amount to charge"
        amount: Decimal!
    }

    """
    Enumeration of possible payment statuses.
    """
    enum PaymentStatus {
        "Payment initiated but not yet processed"
        PENDING
        "Payment is being processed"
        PROCESSING
        "Payment completed successfully"
        COMPLETED
        "Payment failed"
        FAILED
        "Payment was refunded"
        REFUNDED
    }

    """
    Enumeration of supported payment method types.
    """
    enum PaymentType {
        "Credit card payment"
        CREDIT_CARD
        "Debit card payment"
        DEBIT_CARD
        "PayPal payment"
        PAYPAL
        "Apple Pay"
        APPLE_PAY
        "Google Pay"
        GOOGLE_PAY
    }

    """
    Enumeration of supported payment providers.
    """
    enum PaymentProvider {
        "Stripe payment processor"
        STRIPE
        "PayPal payment processor"
        PAYPAL
        "Square payment processor"
        SQUARE
        "Other payment processor"
        OTHER
    }

    type Query {
        """
        Get all payment methods for the current restaurant.
        """
        paymentMethods(restaurantId: ID): [PaymentMethod!]!
        """
        Get a specific payment method by ID.
        """
        paymentMethod(id: ID!): PaymentMethod
        """
        Get all payments. Admin access required.
        """
        payments: [Payment!]!
        """
        Get a specific payment by ID.
        """
        payment(id: ID!): Payment
    }

    type Mutation {
        """
        Create a new payment method for the current restaurant.
        """
        createPaymentMethod(input: CreatePaymentMethodInput!, restaurantId: ID): PaymentMethod!
        """
        Update an existing payment method.
        """
        updatePaymentMethod(id: ID!, input: UpdatePaymentMethodInput!): PaymentMethod!
        """
        Delete a payment method.
        """
        deletePaymentMethod(id: ID!): Boolean!
        """
        Process a payment for an order.
        """
        processPayment(input: ProcessPaymentInput!): Payment!
    }
`;
