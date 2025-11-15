import { validateInput, validateEmail, validatePassword, validationSchemas } from "../validation";
import { z } from "zod";

// Mock GraphQLErrors
jest.mock("../errors", () => ({
    GraphQLErrors: {
        badInput: jest.fn(),
    },
}));

import { GraphQLErrors as MockGraphQLErrors } from "../errors";

const mockGraphQLErrors = MockGraphQLErrors as jest.Mocked<typeof MockGraphQLErrors>;

describe("Validation Utilities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGraphQLErrors.badInput.mockImplementation((message) => {
            throw new Error(message);
        });
    });

    describe("validationSchemas", () => {
        describe("email", () => {
            it("should validate correct email", () => {
                expect(() => validationSchemas.email.parse("test@example.com")).not.toThrow();
                expect(() =>
                    validationSchemas.email.parse("user.name+tag@domain.co.uk"),
                ).not.toThrow();
            });

            it("should reject invalid email", () => {
                expect(() => validationSchemas.email.parse("invalid-email")).toThrow();
                expect(() => validationSchemas.email.parse("")).toThrow();
                expect(() => validationSchemas.email.parse("@example.com")).toThrow();
            });
        });

        describe("password", () => {
            it("should validate password with minimum length", () => {
                expect(() => validationSchemas.password.parse("Password123")).not.toThrow();
                expect(() => validationSchemas.password.parse("ValidPass1")).not.toThrow();
            });

            it("should reject short password", () => {
                expect(() => validationSchemas.password.parse("12345")).toThrow();
                expect(() => validationSchemas.password.parse("")).toThrow();
            });
        });

        describe("cuid", () => {
            it("should validate correct cuid", () => {
                expect(() =>
                    validationSchemas.cuid.parse("cjld2cjxh0000qzrmn831i7rn"),
                ).not.toThrow();
            });

            it("should reject invalid cuid", () => {
                expect(() => validationSchemas.cuid.parse("invalid-cuid")).toThrow();
                expect(() => validationSchemas.cuid.parse("")).toThrow();
            });
        });

        describe("positiveNumber", () => {
            it("should validate positive numbers", () => {
                expect(() => validationSchemas.positiveNumber.parse(1)).not.toThrow();
                expect(() => validationSchemas.positiveNumber.parse(0.01)).not.toThrow();
            });

            it("should reject non-positive numbers", () => {
                expect(() => validationSchemas.positiveNumber.parse(0)).toThrow();
                expect(() => validationSchemas.positiveNumber.parse(-1)).toThrow();
            });
        });

        describe("nonEmptyString", () => {
            it("should validate non-empty strings", () => {
                expect(() => validationSchemas.nonEmptyString.parse("a")).not.toThrow();
                expect(() => validationSchemas.nonEmptyString.parse("hello")).not.toThrow();
            });

            it("should reject empty strings", () => {
                expect(() => validationSchemas.nonEmptyString.parse("")).toThrow();
                expect(() => validationSchemas.nonEmptyString.parse("   ")).toThrow();
            });
        });

        describe("phone", () => {
            it("should validate phone numbers", () => {
                expect(() => validationSchemas.phone.parse("+1234567890")).not.toThrow();
                expect(() => validationSchemas.phone.parse("123 456 7890")).not.toThrow();
                expect(() => validationSchemas.phone.parse("(123) 456-7890")).not.toThrow();
            });

            it("should reject invalid phone numbers", () => {
                expect(() => validationSchemas.phone.parse("abc")).toThrow();
                expect(() => validationSchemas.phone.parse("")).toThrow();
            });
        });
    });

    describe("validateInput", () => {
        const testSchema = z.object({
            name: z.string().min(1),
            age: z.number().positive(),
        });

        it("should return validated data for valid input", () => {
            const input = { name: "John", age: 25 };
            const result = validateInput(testSchema, input);
            expect(result).toEqual(input);
        });

        it("should throw GraphQL error for invalid input", () => {
            const input = { name: "", age: -5 };

            expect(() => validateInput(testSchema, input)).toThrow();
            expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith(
                expect.stringContaining("Validation failed"),
            );
        });

        it("should include field-specific error messages", () => {
            const input = { name: "", age: "not-a-number" };

            expect(() => validateInput(testSchema, input)).toThrow();
            expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith(
                expect.stringContaining("name:"),
            );
            expect(mockGraphQLErrors.badInput).toHaveBeenCalledWith(
                expect.stringContaining("age:"),
            );
        });
    });

    describe("validateEmail", () => {
        it("should validate and trim email", () => {
            expect(validateEmail("  test@example.com  ")).toBe("test@example.com");
            expect(validateEmail("Test.User@Example.Com")).toBe("test.user@example.com");
        });

        it("should throw for invalid email", () => {
            expect(() => validateEmail("invalid-email")).toThrow();
        });
    });

    describe("validatePassword", () => {
        it("should validate password", () => {
            expect(validatePassword("SecurePass123")).toBe("SecurePass123");
        });

        it("should throw for invalid password", () => {
            expect(() => validatePassword("12345")).toThrow();
        });
    });
});
