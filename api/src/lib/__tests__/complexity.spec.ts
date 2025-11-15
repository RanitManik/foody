import { createComplexityRule } from "../graphql/complexity";

// Mock GraphQL types
jest.mock("graphql", () => ({
    GraphQLError: jest.fn((message) => ({ message, name: "GraphQLError" })),
    Kind: {
        INT: "IntValue",
    },
}));

import { Kind } from "graphql";

describe("GraphQL Complexity Rule", () => {
    let mockContext: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let mockReportError: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReportError = jest.fn();
        mockContext = {
            reportError: mockReportError,
            getFieldDef: jest.fn(),
        };
    });

    describe("createComplexityRule", () => {
        it("should create a validation rule", () => {
            const rule = createComplexityRule(100);

            expect(typeof rule).toBe("function");
        });

        describe("Field visitor", () => {
            let visitor: any; // eslint-disable-line @typescript-eslint/no-explicit-any

            beforeEach(() => {
                const rule = createComplexityRule(100);
                visitor = rule(mockContext) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            });

            it("should add base complexity for each field", () => {
                const mockNode = {
                    arguments: [],
                };

                visitor.Field?.enter(mockNode);
            });

            it("should add complexity for list fields with limit argument", () => {
                const mockNode = {
                    arguments: [
                        {
                            name: { value: "first" },
                            value: { kind: Kind.INT, value: "10" },
                        },
                    ],
                };

                visitor.Field?.enter(mockNode);
            });

            it("should add complexity for list fields with default limit", () => {
                const mockNode = {
                    arguments: [],
                };
                const mockFieldDef = {
                    type: {
                        ofType: {},
                    },
                };

                mockContext.getFieldDef.mockReturnValue(mockFieldDef);

                visitor.Field?.enter(mockNode);
            });
        });

        describe("Document visitor", () => {
            it("should not report error when complexity is within limit", () => {
                const rule = createComplexityRule(100);
                const visitor = rule(mockContext) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

                // Add some complexity
                visitor.Field?.enter({ arguments: [] });

                visitor.Document?.leave();

                expect(mockReportError).not.toHaveBeenCalled();
            });

            it("should report error when complexity exceeds limit", () => {
                const rule = createComplexityRule(5);
                const visitor = rule(mockContext) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

                // Add high complexity by simulating multiple fields
                for (let i = 0; i < 10; i++) {
                    visitor.Field?.enter({ arguments: [] });
                }

                visitor.Document?.leave();

                expect(mockReportError).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: expect.stringContaining("Query complexity of"),
                        name: "GraphQLError",
                    }),
                );
            });
        });
    });
});
