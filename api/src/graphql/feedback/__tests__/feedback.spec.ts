import { feedbackResolvers } from "../resolver";
import { UserRole } from "@prisma/client";

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        feedbacks: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock("../../../lib/shared/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/errors", () => ({
    GraphQLErrors: {
        unauthenticated: jest.fn(),
        badInput: jest.fn(),
        forbidden: jest.fn(),
        notFound: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/validation", () => ({
    validateInput: jest.fn(),
    CreateFeedbackInputSchema: {
        parse: jest.fn().mockImplementation((input) => input),
    },
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput } from "../../../lib/shared/validation";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;

const createContext = (overrides: Partial<GraphQLContext> = {}): GraphQLContext => ({
    prisma: mockPrisma as unknown as GraphQLContext["prisma"],
    user: null,
    ...overrides,
});

const buildAdminUser = () => ({
    id: "admin-123",
    email: "admin@example.com",
    role: UserRole.ADMIN,
    restaurantId: null,
    firstName: "Admin",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

const buildMemberUser = () => ({
    id: "member-123",
    email: "member@example.com",
    role: UserRole.MEMBER,
    restaurantId: "restaurant-123",
    firstName: "Member",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe("Feedback Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        mockGraphQLErrors.forbidden.mockImplementation(() => {
            throw new Error("Forbidden");
        });
        mockGraphQLErrors.badInput.mockImplementation((msg?: string) => {
            throw new Error(msg || "Bad input");
        });
    });

    describe("Query", () => {
        describe("feedbacks", () => {
            it("should return feedbacks for admin", async () => {
                const mockFeedbacks = [
                    {
                        id: "fb-1",
                        message: "Great service!",
                        email: "user@example.com",
                        userId: "user-123",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: "fb-2",
                        message: "Food was delicious",
                        email: null,
                        userId: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ];

                (mockPrisma.feedbacks.findMany as jest.Mock).mockResolvedValue(mockFeedbacks);

                const context = createContext({ user: buildAdminUser() });
                const result = await feedbackResolvers.Query?.feedbacks?.(
                    null,
                    { first: 10, skip: 0 },
                    context,
                );

                expect(result).toEqual(mockFeedbacks);
                expect(mockPrisma.feedbacks.findMany).toHaveBeenCalledWith({
                    take: 10,
                    skip: 0,
                    orderBy: { createdAt: "desc" },
                });
            });

            it("should use default pagination values", async () => {
                const mockFeedbacks = [
                    {
                        id: "fb-1",
                        message: "Feedback",
                        email: null,
                        userId: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ];

                (mockPrisma.feedbacks.findMany as jest.Mock).mockResolvedValue(mockFeedbacks);

                const context = createContext({ user: buildAdminUser() });
                await feedbackResolvers.Query?.feedbacks?.(null, {}, context);

                expect(mockPrisma.feedbacks.findMany).toHaveBeenCalledWith({
                    take: 25,
                    skip: 0,
                    orderBy: { createdAt: "desc" },
                });
            });

            it("should deny access for non-admin", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    feedbackResolvers.Query?.feedbacks?.(null, {}, context),
                ).rejects.toThrow("Forbidden");
            });

            it("should deny access when not authenticated", async () => {
                const context = createContext();

                await expect(
                    feedbackResolvers.Query?.feedbacks?.(null, {}, context),
                ).rejects.toThrow("Forbidden");
            });
        });
    });

    describe("Mutation", () => {
        describe("createFeedback", () => {
            const validInput = {
                message: "This is a test feedback message",
                email: "test@example.com",
            };

            it("should create feedback with authenticated user", async () => {
                const mockCreatedFeedback = {
                    id: "fb-new",
                    message: validInput.message,
                    email: validInput.email,
                    userId: "member-123",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.feedbacks.create as jest.Mock).mockResolvedValue(mockCreatedFeedback);

                const context = createContext({ user: buildMemberUser() });
                const result = await feedbackResolvers.Mutation?.createFeedback?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedFeedback);
                expect(mockPrisma.feedbacks.create).toHaveBeenCalledWith({
                    data: {
                        message: validInput.message,
                        email: validInput.email,
                        userId: "member-123",
                    },
                });
            });

            it("should create feedback without email", async () => {
                const inputWithoutEmail = {
                    message: "Feedback without email",
                };

                const mockCreatedFeedback = {
                    id: "fb-new",
                    message: inputWithoutEmail.message,
                    email: undefined,
                    userId: "member-123",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.feedbacks.create as jest.Mock).mockResolvedValue(mockCreatedFeedback);

                const context = createContext({ user: buildMemberUser() });
                const result = await feedbackResolvers.Mutation?.createFeedback?.(
                    null,
                    { input: inputWithoutEmail },
                    context,
                );

                expect(result).toEqual(mockCreatedFeedback);
                expect(mockPrisma.feedbacks.create).toHaveBeenCalledWith({
                    data: {
                        message: inputWithoutEmail.message,
                        email: undefined,
                        userId: "member-123",
                    },
                });
            });

            it("should create feedback for anonymous user", async () => {
                const mockCreatedFeedback = {
                    id: "fb-new",
                    message: validInput.message,
                    email: validInput.email,
                    userId: undefined,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.feedbacks.create as jest.Mock).mockResolvedValue(mockCreatedFeedback);

                const context = createContext(); // No user
                const result = await feedbackResolvers.Mutation?.createFeedback?.(
                    null,
                    { input: validInput },
                    context,
                );

                expect(result).toEqual(mockCreatedFeedback);
                expect(mockPrisma.feedbacks.create).toHaveBeenCalledWith({
                    data: {
                        message: validInput.message,
                        email: validInput.email,
                        userId: undefined,
                    },
                });
            });

            it("should handle validation errors", async () => {
                mockValidateInput.mockImplementation(() => {
                    throw new Error("Validation failed");
                });

                const context = createContext({ user: buildMemberUser() });

                await expect(
                    feedbackResolvers.Mutation?.createFeedback?.(
                        null,
                        { input: { message: "" } },
                        context,
                    ),
                ).rejects.toThrow("Validation failed");
            });

            it("should handle database errors", async () => {
                (mockPrisma.feedbacks.create as jest.Mock).mockRejectedValue(
                    new Error("Database error"),
                );

                const context = createContext({ user: buildMemberUser() });

                await expect(
                    feedbackResolvers.Mutation?.createFeedback?.(
                        null,
                        { input: validInput },
                        context,
                    ),
                ).rejects.toThrow("Database error");
            });
        });
    });
});
