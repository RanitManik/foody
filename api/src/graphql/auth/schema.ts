// Auth GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Basic user information returned by authentication operations.
    """
    type User {
        "Unique identifier for the user"
        id: ID!
        "Email address used for login"
        email: String!
        "User's first name"
        firstName: String!
        "User's last name"
        lastName: String!
    "User's role determining permissions"
    role: UserRole!
    "Restaurant assigned to the user (for managers and members)"
    restaurantId: ID
        "Whether the user account is active"
        isActive: Boolean!
        "Timestamp when the user account was created"
        createdAt: DateTime!
        "Timestamp when the user account was last updated"
        updatedAt: DateTime!
    }

    """
    Authentication response containing JWT token and user information.
    """
    type AuthPayload {
        "JWT token for authenticated requests"
        token: String!
        "Authenticated user information"
        user: User!
    }

    """
    Input for user registration.
    """
    input RegisterInput {
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
    }

    """
    Input for user login.
    """
    input LoginInput {
        "Email address of the account"
        email: String!
        "Password for the account"
        password: String!
    }

    """
    User role enumeration defining permission levels.
    """
    enum UserRole {
        "Full system administrator with all permissions"
        ADMIN
        "Manager responsible for a specific location"
        MANAGER
        "Staff member scoped to a single restaurant"
        MEMBER
    }

    type Query {
        """
        Get the current authenticated user's basic information.
        """
        me: User
    }

    type Mutation {
        """
    "Register a new user account.
    Admin-only operation to create managers and members scoped to a restaurant.
        """
        register(input: RegisterInput!): AuthPayload!
        """
        Login with existing credentials.
        Returns authentication token and user information.
        """
        login(input: LoginInput!): AuthPayload!
    }
`;
