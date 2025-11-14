// Order GraphQL schema definitions
export const typeDefs = `#graphql
    type Order {
        id: ID!
        status: OrderStatus!
        totalAmount: Decimal!
        deliveryAddress: String!
        phone: String!
        specialInstructions: String
        user: User!
        items: [OrderItem!]!
        payment: Payment
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type OrderItem {
        id: ID!
        quantity: Int!
        price: Decimal!
        notes: String
        order: Order!
        menuItem: MenuItem!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input CreateOrderInput {
        items: [OrderItemInput!]!
        deliveryAddress: String!
        phone: String!
        specialInstructions: String
        paymentMethodId: ID!
    }

    input OrderItemInput {
        menuItemId: ID!
        quantity: Int!
        notes: String
    }

    input UpdateOrderInput {
        status: OrderStatus
        deliveryAddress: String
        phone: String
        specialInstructions: String
    }

    enum OrderStatus {
        PENDING
        CONFIRMED
        PREPARING
        READY
        DELIVERED
        CANCELLED
    }

    type Query {
        orders(first: Int, skip: Int): [Order!]!
        order(id: ID!): Order
    }

    type Mutation {
        createOrder(input: CreateOrderInput!): Order!
        updateOrder(id: ID!, input: UpdateOrderInput!): Order!
        cancelOrder(id: ID!): Order!
    }
`;
