// Auth GraphQL schema definitions
export const typeDefs = `#graphql
    type User {
        id: ID!
        email: String!
        firstName: String!
        lastName: String!
        role: UserRole!
        country: Country
        isActive: Boolean!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type AuthPayload {
        token: String!
        user: User!
    }

    input RegisterInput {
        email: String!
        password: String!
        firstName: String!
        lastName: String!
        role: UserRole!
        country: Country
    }

    input LoginInput {
        email: String!
        password: String!
    }

    enum UserRole {
        ADMIN
        MANAGER_INDIA
        MANAGER_AMERICA
        MEMBER_INDIA
        MEMBER_AMERICA
    }

    enum Country {
        INDIA
        AMERICA
    }

    type Query {
        me: User
    }

    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(input: LoginInput!): AuthPayload!
    }
`;
