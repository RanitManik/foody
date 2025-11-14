import { GraphQLScalarType, Kind } from "graphql";

// Common GraphQL scalar definitions
export const scalarTypeDefs = `#graphql
    scalar DateTime
    scalar Decimal
`;

// DateTime scalar resolver
export const DateTimeScalar = new GraphQLScalarType({
    name: "DateTime",
    description: "DateTime custom scalar type",
    serialize(value: unknown): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === "string") {
            return value;
        }
        throw new Error("DateTime can only serialize Date or string values");
    },
    parseValue(value: unknown): Date {
        if (typeof value === "string") {
            return new Date(value);
        }
        throw new Error("DateTime can only parse string values");
    },
    parseLiteral(ast): Date {
        if (ast.kind === Kind.STRING) {
            return new Date(ast.value);
        }
        throw new Error("DateTime can only parse string literals");
    },
});

// Decimal scalar resolver (treats as number for now, can be enhanced with decimal.js if needed)
export const DecimalScalar = new GraphQLScalarType({
    name: "Decimal",
    description: "Decimal custom scalar type",
    serialize(value: unknown): number {
        if (typeof value === "number") {
            return value;
        }
        if (typeof value === "string") {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
                throw new Error("Decimal can only serialize numeric values");
            }
            return parsed;
        }
        throw new Error("Decimal can only serialize number or numeric string values");
    },
    parseValue(value: unknown): number {
        if (typeof value === "number") {
            return value;
        }
        if (typeof value === "string") {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
                throw new Error("Decimal can only parse numeric values");
            }
            return parsed;
        }
        throw new Error("Decimal can only parse number or numeric string values");
    },
    parseLiteral(ast): number {
        if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
            return parseFloat(ast.value);
        }
        if (ast.kind === Kind.STRING) {
            const parsed = parseFloat(ast.value);
            if (isNaN(parsed)) {
                throw new Error("Decimal can only parse numeric literals");
            }
            return parsed;
        }
        throw new Error("Decimal can only parse numeric literals");
    },
});

// Export scalar resolvers
export const scalarResolvers = {
    DateTime: DateTimeScalar,
    Decimal: DecimalScalar,
};
