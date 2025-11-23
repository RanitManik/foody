export const typeDefs = `#graphql
    """
    Feedback sent by users or visitors. May be anonymous or associated with a user account.
    """
    type Feedback {
        id: ID!
        userId: ID
        email: String
        message: String!
        createdAt: DateTime!
    }

    input CreateFeedbackInput {
        message: String!
        email: String
    }

    extend type Query {
        """List recent feedback submissions (admin only)."""
        feedbacks(first: Int, skip: Int): [Feedback!]!
    }

    extend type Mutation {
        """Submit feedback about the product or report an issue."""
        createFeedback(input: CreateFeedbackInput!): Feedback!
    }
`;
