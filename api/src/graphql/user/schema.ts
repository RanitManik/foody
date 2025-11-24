// User GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a user account with role-based access control and restaurant assignments.
    Users can be members, managers, or admins with different permission levels.
    """
    type User {
        "Unique identifier for the user"
        id: ID!
        "Email address used for login and notifications"
        email: String!
        "User's first name"
        firstName: String!
        "User's last name"
        lastName: String!
        "User's role determining permissions (ADMIN, MANAGER, MEMBER)"
        role: UserRole!
        "Restaurant assigned to the user (managers and members only)"
        restaurantId: ID
        "Restaurant details for the user"
        restaurant: Restaurant
        "Whether the user account is active"
        isActive: Boolean!
        "Timestamp when the user account was created"
        createdAt: DateTime!
        "Timestamp when the user account was last updated"
        updatedAt: DateTime!
    }

    """
    Input for updating user profile information. All fields are optional.
    """
    input UpdateUserInput {
        "Updated email address"
        email: String
        "Updated password"
        password: String
        "Updated first name"
        firstName: String
        "Updated last name"
        lastName: String
        "Updated role"
        role: UserRole
    "Updated restaurant assignment"
    restaurantId: ID
        "Updated active status"
        isActive: Boolean
    }

    """
    Input for creating a new user account. Admin-only operation.
    """
    input CreateUserInput {
        "Email address for the new account"
        email: String!
        "Password for the new account"
        password: String!
        "User's first name"
        firstName: String!
        "User's last name"
        lastName: String!
        "Role to assign to the user"
        role: UserRole!
        "Restaurant assignment for the user (required for non-admin roles)"
        restaurantId: ID
        "Whether the account should be active"
        isActive: Boolean
    }

    """
    Connection type for paginated users with total count
    """
    type UserConnection {
        "List of users for the current page"
        users: [User!]!
        "Total number of users matching the query"
        totalCount: Int!
    }

    type Query {
        """
        Get a paginated list of users.
        Only admins can view the user list.
        """
        users(first: Int, skip: Int, restaurantId: ID): UserConnection!
        """
        Get a specific user by ID.
        Only admins can view individual user details.
        """
        user(id: ID!): User
        """
        Get the current authenticated user's profile information.
        """
        me: User
    }

    type Mutation {
        """
        Create a new user account.
        Only admins can create user accounts.
        """
        createUser(input: CreateUserInput!): User!
        """
        Update a user's profile information.
        Only admins can update user information.
        """
        updateUser(id: ID!, input: UpdateUserInput!): User!
        """
        Delete a user account.
        Only admins can delete users.
        """
        deleteUser(id: ID!): Boolean!
    }
`;
