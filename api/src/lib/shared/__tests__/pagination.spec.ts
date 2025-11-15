import { parsePagination, DEFAULT_PAGINATION, PaginationInputSchema } from "../pagination";

describe("Pagination Utilities", () => {
    describe("DEFAULT_PAGINATION", () => {
        it("should have correct default values", () => {
            expect(DEFAULT_PAGINATION).toEqual({
                first: 20,
                skip: 0,
            });
        });
    });

    describe("PaginationInputSchema", () => {
        it("should validate correct pagination input", () => {
            const input = { first: 10, skip: 5, after: "c123456789" };
            expect(() => PaginationInputSchema.parse(input)).not.toThrow();
        });

        it("should reject negative first value", () => {
            const input = { first: -1 };
            expect(() => PaginationInputSchema.parse(input)).toThrow();
        });

        it("should reject first value over 100", () => {
            const input = { first: 101 };
            expect(() => PaginationInputSchema.parse(input)).toThrow();
        });

        it("should reject negative skip value", () => {
            const input = { skip: -1 };
            expect(() => PaginationInputSchema.parse(input)).toThrow();
        });

        it("should validate cuid for after", () => {
            const input = { after: "cjld2cjxh0000qzrmn831i7rn" };
            expect(() => PaginationInputSchema.parse(input)).not.toThrow();
        });

        it("should reject invalid cuid for after", () => {
            const input = { after: "invalid-cuid" };
            expect(() => PaginationInputSchema.parse(input)).toThrow();
        });
    });

    describe("parsePagination", () => {
        it("should return default pagination when no input provided", () => {
            const result = parsePagination();
            expect(result).toEqual(DEFAULT_PAGINATION);
        });

        it("should return default pagination when input is undefined", () => {
            const result = parsePagination(undefined);
            expect(result).toEqual(DEFAULT_PAGINATION);
        });

        it("should use provided first value", () => {
            const input = { first: 50 };
            const result = parsePagination(input);
            expect(result).toEqual({
                first: 50,
                skip: 0,
            });
        });

        it("should use provided skip value", () => {
            const input = { skip: 10 };
            const result = parsePagination(input);
            expect(result).toEqual({
                first: 20,
                skip: 10,
            });
        });

        it("should use both first and skip values", () => {
            const input = { first: 30, skip: 15 };
            const result = parsePagination(input);
            expect(result).toEqual({
                first: 30,
                skip: 15,
            });
        });

        it("should ignore after field (not used in parsePagination)", () => {
            const input = { first: 25, after: "c123456789" };
            const result = parsePagination(input);
            expect(result).toEqual({
                first: 25,
                skip: 0,
            });
        });

        it("should handle empty object input", () => {
            const result = parsePagination({});
            expect(result).toEqual(DEFAULT_PAGINATION);
        });
    });
});
