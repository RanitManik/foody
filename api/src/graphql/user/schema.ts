// User GraphQL schema definitions
export const typeDefs = `#graphql
    type User {
        id: ID!
        email: String!
        firstName: String!
        lastName: String!
        role: UserRole!
        country: Country
        isActive: Boolean!
        orders: [Order!]!
        paymentMethods: [PaymentMethod!]!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input UpdateUserInput {
        firstName: String
        lastName: String
        isActive: Boolean
    }

    type Query {
        users(first: Int, skip: Int): [User!]!
        user(id: ID!): User
        me: User
    }

    type Mutation {
        updateUser(id: ID!, input: UpdateUserInput!): User!
        deleteUser(id: ID!): Boolean!
    }
`;
