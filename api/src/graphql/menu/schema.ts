// Menu GraphQL schema definitions
export const typeDefs = `#graphql
    type MenuItem {
        id: ID!
        name: String!
        description: String
        price: Decimal!
        imageUrl: String
        isAvailable: Boolean!
        category: String
        restaurant: Restaurant!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input CreateMenuItemInput {
        name: String!
        description: String
        price: Decimal!
        imageUrl: String
        category: String
        restaurantId: ID!
    }

    input UpdateMenuItemInput {
        name: String
        description: String
        price: Decimal
        imageUrl: String
        isAvailable: Boolean
        category: String
    }

    type Query {
        menuItems(restaurantId: ID, first: Int, skip: Int): [MenuItem!]!
        menuItem(id: ID!): MenuItem
        menuCategories(restaurantId: ID): [String!]!
    }

    type Mutation {
        createMenuItem(input: CreateMenuItemInput!): MenuItem!
        updateMenuItem(id: ID!, input: UpdateMenuItemInput!): MenuItem!
        deleteMenuItem(id: ID!): Boolean!
    }
`;
