// Restaurant GraphQL schema definitions
export const typeDefs = `#graphql
    type Restaurant {
        id: ID!
        name: String!
        description: String
        address: String!
        city: String!
        country: Country!
        phone: String
        email: String
        isActive: Boolean!
        menuItems: [MenuItem!]!
        menuCategories: [String!]!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input CreateRestaurantInput {
        name: String!
        description: String
        address: String!
        city: String!
        country: Country!
        phone: String
        email: String
    }

    input UpdateRestaurantInput {
        name: String
        description: String
        address: String
        city: String
        phone: String
        email: String
        isActive: Boolean
    }

    type Query {
        restaurants(country: Country, first: Int, skip: Int): [Restaurant!]!
        restaurant(id: ID!): Restaurant
    }

    type Mutation {
        createRestaurant(input: CreateRestaurantInput!): Restaurant!
        updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!
        deleteRestaurant(id: ID!): Boolean!
    }
`;
