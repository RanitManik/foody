// Restaurant GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a restaurant with location, contact information, and menu offerings.
    Restaurants are restricted by assigned locations for access control.
    """
    type Restaurant {
        "Unique identifier for the restaurant"
        id: ID!
        "Name of the restaurant"
        name: String!
        "Detailed description of the restaurant"
        description: String
        "Physical address of the restaurant"
        address: String!
        "City where the restaurant is located"
        city: String!
    "Named location where the restaurant operates (for example: Downtown, Midtown)"
    location: String!
        "Contact phone number"
        phone: String
        "Contact email address"
        email: String
        "Whether the restaurant is currently active and accepting orders"
        isActive: Boolean!
        "List of menu items offered by this restaurant"
        menuItems: [MenuItem!]!
        "List of unique menu categories offered by this restaurant"
        menuCategories: [String!]!
        "Timestamp when the restaurant was created"
        createdAt: DateTime!
        "Timestamp when the restaurant was last updated"
        updatedAt: DateTime!
    }

    """
    Input for creating a new restaurant.
    """
    input CreateRestaurantInput {
        "Name of the restaurant"
        name: String!
        "Detailed description of the restaurant"
        description: String
        "Physical address of the restaurant"
        address: String!
        "City where the restaurant is located"
        city: String!
    "Named location where the restaurant operates"
    location: String!
        "Contact phone number"
        phone: String
        "Contact email address"
        email: String
    }

    """
    Input for updating an existing restaurant. All fields are optional.
    """
    input UpdateRestaurantInput {
        "Updated name of the restaurant"
        name: String
        "Updated description of the restaurant"
        description: String
        "Updated address"
        address: String
        "Updated city"
        city: String
    "Updated location"
    location: String
        "Updated phone number"
        phone: String
        "Updated email address"
        email: String
        "Updated active status"
        isActive: Boolean
    }

    type Query {
        """
    Get a paginated list of restaurants. Can filter by location.
    Non-admin users can only see restaurants in their assigned location.
    """
    restaurants(location: String, first: Int, skip: Int): [Restaurant!]!
        """
        Get a specific restaurant by ID.
    Access control ensures users can only view restaurants in their assigned location.
        """
        restaurant(id: ID!): Restaurant
    }

    type Mutation {
        """
        Create a new restaurant.
        Only admins can create restaurants.
        """
        createRestaurant(input: CreateRestaurantInput!): Restaurant!
        """
        Update an existing restaurant.
        Only admins can update restaurants.
        """
        updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!
        """
        Delete a restaurant.
        Only admins can delete restaurants.
        """
        deleteRestaurant(id: ID!): Boolean!
    }
`;
