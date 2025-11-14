import { z } from "zod";
import { GraphQLErrors } from "./errors";
import { UserRole, Country } from "@prisma/client";

/**
 * Common validation schemas
 */
export const validationSchemas = {
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    cuid: z.cuid("Invalid ID format"),
    positiveNumber: z.number().positive("Must be a positive number"),
    nonEmptyString: z.string().min(1, "Cannot be empty"),
    phone: z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number format"),
};

/**
 * Validate input against a Zod schema and throw GraphQL error if invalid
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success) {
        const errors = result.error.issues
            .map((e: z.core.$ZodIssue) => {
                const path = e.path.length > 0 ? e.path.join(".") : "root";
                return `${path}: ${e.message}`;
            })
            .join(", ");
        throw GraphQLErrors.badInput(`Validation failed: ${errors}`);
    }
    return result.data;
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): string {
    return validationSchemas.email.parse(email.toLowerCase().trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string {
    return validationSchemas.password.parse(password);
}

/**
 * Auth Input Schemas
 */
// Create enum schemas from Prisma enums (using z.enum() instead of deprecated z.nativeEnum())
export const UserRoleEnum = z.enum([
    UserRole.ADMIN,
    UserRole.MANAGER_INDIA,
    UserRole.MANAGER_AMERICA,
    UserRole.MEMBER_INDIA,
    UserRole.MEMBER_AMERICA,
] as [UserRole, ...UserRole[]]);

export const CountryEnum = z.enum([Country.INDIA, Country.AMERICA] as [Country, ...Country[]]);

export const RegisterInputSchema = z.object({
    email: validationSchemas.email,
    password: validationSchemas.password,
    firstName: z.string().min(1, "First name is required").max(100, "First name too long"),
    lastName: z.string().min(1, "Last name is required").max(100, "Last name too long"),
    role: UserRoleEnum,
    country: CountryEnum.optional(),
});

export const LoginInputSchema = z.object({
    email: validationSchemas.email,
    password: z.string().min(1, "Password is required"),
});

/**
 * Menu Input Schemas
 */
export const CreateMenuItemInputSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(1000, "Description too long").optional(),
    price: validationSchemas.positiveNumber,
    category: z.string().min(1, "Category is required").max(100, "Category too long"),
    imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
    restaurantId: validationSchemas.cuid,
});

/**
 * Order Input Schemas
 */
export const OrderItemInputSchema = z.object({
    menuItemId: validationSchemas.cuid,
    quantity: z
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be greater than 0"),
    notes: z.string().max(500, "Notes too long").optional(),
});

export const CreateOrderInputSchema = z.object({
    items: z.array(OrderItemInputSchema).min(1, "At least one item is required"),
    deliveryAddress: z.string().min(1, "Delivery address is required").max(500, "Address too long"),
    phone: validationSchemas.phone,
    specialInstructions: z.string().max(1000, "Special instructions too long").optional(),
    paymentMethodId: validationSchemas.cuid,
});

/**
 * Restaurant Input Schemas
 */
export const CreateRestaurantInputSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(2000, "Description too long").optional(),
    address: z.string().min(1, "Address is required").max(500, "Address too long"),
    city: z.string().min(1, "City is required").max(100, "City too long"),
    country: CountryEnum,
    phone: validationSchemas.phone.optional().or(z.literal("")),
    email: validationSchemas.email.optional().or(z.literal("")),
});

/**
 * Payment Input Schemas
 */
export const CreatePaymentMethodInputSchema = z.object({
    type: z.string().min(1, "Payment type is required").max(50, "Type too long"),
    provider: z.string().min(1, "Provider is required").max(50, "Provider too long"),
    token: z.string().min(1, "Token is required"),
});

/**
 * User Update Input Schema
 */
export const UpdateUserInputSchema = z.object({
    id: validationSchemas.cuid,
    role: UserRoleEnum.optional(),
    country: CountryEnum.optional(),
    isActive: z.boolean().optional(),
});
