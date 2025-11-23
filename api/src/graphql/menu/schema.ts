// Menu GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a menu item available at a restaurant, including pricing and availability information.
    """
    type MenuItem {
        "Unique identifier for the menu item"
        id: ID!
        "Name of the menu item"
        name: String!
        "Detailed description of the menu item"
        description: String
        "Price of the menu item"
        price: Decimal!
        "URL to the menu item's image"
        imageUrl: String
        "Whether the menu item is currently available for ordering"
        isAvailable: Boolean!
        "Category the menu item belongs to (e.g., 'Appetizers', 'Main Course')"
        category: String
        "Restaurant that offers this menu item"
        restaurant: Restaurant!
        "Timestamp when the menu item was created"
        createdAt: DateTime!
        "Timestamp when the menu item was last updated"
        updatedAt: DateTime!
    }

    """
    Input for creating a new menu item.
    """
    input CreateMenuItemInput {
        "Name of the menu item"
        name: String!
        "Detailed description of the menu item"
        description: String
        "Price of the menu item"
        price: Decimal!
        "URL to the menu item's image"
        imageUrl: String
        "Category the menu item belongs to"
        category: String
        "ID of the restaurant offering this menu item"
        restaurantId: ID!
    }

    """
    Input for updating an existing menu item. All fields are optional.
    """
    input UpdateMenuItemInput {
        "Updated name of the menu item"
        name: String
        "Updated description of the menu item"
        description: String
        "Updated price of the menu item"
        price: Decimal
        "Updated image URL"
        imageUrl: String
        "Updated availability status"
        isAvailable: Boolean
        "Updated category"
        category: String
    }

    """
    Paginated result for menu items query
    """
    type MenuItemsResult {
        "Array of menu items"
        menuItems: [MenuItem!]!
        "Total count of menu items matching the query"
        totalCount: Int!
    }

    type Query {
        """
        Get a paginated list of menu items. Can filter by restaurant.
        Returns all items for restaurant managers and admins, only available items for others.
        """
        menuItems(restaurantId: ID, first: Int, skip: Int): MenuItemsResult!
        """
        Get a specific menu item by ID.
        """
        menuItem(id: ID!): MenuItem
        """
        Get all unique menu categories, optionally filtered by restaurant.
        """
        menuCategories(restaurantId: ID): [String!]!
    }

    type Mutation {
        """
        Create a new menu item for a restaurant.
        Only managers and admins can create menu items.
        """
        createMenuItem(input: CreateMenuItemInput!): MenuItem!
        """
        Update an existing menu item.
        Only managers and admins can update menu items.
        """
        updateMenuItem(id: ID!, input: UpdateMenuItemInput!): MenuItem!
        """
        Delete a menu item.
        Only managers and admins can delete menu items.
        """
        deleteMenuItem(id: ID!): Boolean!
    }
`;
