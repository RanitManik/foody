// User GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a user account with role-based access control and country restrictions.
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
        "User's role determining permissions (MEMBER_INDIA, MEMBER_AMERICA, MANAGER_INDIA, MANAGER_AMERICA, ADMIN)"
        role: UserRole!
        "Country the user belongs to (only for non-admin users)"
        country: Country
        "Whether the user account is active"
        isActive: Boolean!
        "List of orders placed by this user"
        orders: [Order!]!
        "List of payment methods associated with this user"
        paymentMethods: [PaymentMethod!]!
        "Timestamp when the user account was created"
        createdAt: DateTime!
        "Timestamp when the user account was last updated"
        updatedAt: DateTime!
    }

    """
    Input for updating user profile information. All fields are optional.
    """
    input UpdateUserInput {
        "Updated first name"
        firstName: String
        "Updated last name"
        lastName: String
        "Updated active status"
        isActive: Boolean
    }

    type Query {
        """
        Get a paginated list of users.
        Only admins can view the user list.
        """
        users(first: Int, skip: Int): [User!]!
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
        Update a user's profile information.
        Only admins can update user information.
        """
        updateUser(id: ID!, role: UserRole, country: Country, isActive: Boolean): User!
        """
        Delete a user account.
        Only admins can delete users.
        """
        deleteUser(id: ID!): Boolean!
    }
`;
