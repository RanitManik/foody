import { z } from "zod";
import { GraphQLErrors } from "./errors";
import { UserRole } from "@prisma/client";

/**
 * Input sanitization utilities
 */
export const sanitize = {
    /**
     * Sanitize string input by trimming and removing potentially dangerous characters
     */
    string: (input: string): string => {
        if (typeof input !== "string") return "";

        // Trim whitespace
        let sanitized = input.trim();

        // Basic XSS prevention - remove script tags and common attack vectors
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/javascript:/gi, "")
            .replace(/on\w+\s*=/gi, "");

        return sanitized;
    },

    /**
     * Sanitize email by trimming and basic validation
     */
    email: (email: string): string => {
        const sanitized = sanitize.string(email).toLowerCase();
        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
            throw new Error("Invalid email format");
        }
        return sanitized;
    },

    /**
     * Sanitize HTML content (basic - for rich text fields)
     */
    html: (input: string): string => {
        if (typeof input !== "string") return "";

        let sanitized = input.trim();

        // Remove dangerous tags and attributes
        const dangerousTags = ["script", "iframe", "object", "embed", "form", "input", "button"];
        dangerousTags.forEach((tag) => {
            const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`, "gi");
            sanitized = sanitized.replace(regex, "");
        });

        // Remove dangerous attributes
        const dangerousAttrs = ["on\\w+", "javascript:", "vbscript:", "data:", "src="];
        dangerousAttrs.forEach((attr) => {
            const regex = new RegExp(`\\s${attr}[^\\s]*`, "gi");
            sanitized = sanitized.replace(regex, "");
        });

        return sanitized;
    },

    /**
     * Sanitize SQL-like inputs (prevent SQL injection patterns)
     */
    sqlInput: (input: string): string => {
        const sanitized = sanitize.string(input);

        // Remove common SQL injection patterns
        const sqlPatterns = [
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
            /(-{2}|\/\*|\*\/)/g, // Comments
            /('|(\\x27)|(\\x2D))/g, // Quotes and dashes
        ];

        let result = sanitized;
        sqlPatterns.forEach((pattern) => {
            result = result.replace(pattern, "");
        });

        return result;
    },
};

/**
 * Common validation schemas
 */
export const validationSchemas = {
    email: z.email("Invalid email format").transform(sanitize.email),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one lowercase letter, one uppercase letter, and one number",
        ),
    cuid: z.string().regex(/^[cC][^\s-]{8,}$/, "Invalid ID format"),
    id: z
        .string()
        .min(1, "ID cannot be empty")
        .max(100, "ID too long")
        .regex(
            /^[\w-]+$/,
            "Invalid ID format - only letters, numbers, hyphens, and underscores allowed",
        ),
    positiveNumber: z.number().positive("Must be a positive number"),
    nonEmptyString: z.string().trim().min(1, "Cannot be empty").transform(sanitize.string),
    phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
    url: z.url("Invalid URL format"),
    safeString: z.string().max(1000, "Input too long").transform(sanitize.string),
    safeHtml: z.string().max(10000, "Content too long").transform(sanitize.html),
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
export const UserRoleEnum = z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER] as [
    UserRole,
    ...UserRole[],
]);

export const RegisterInputSchema = z.object({
    email: validationSchemas.email,
    password: validationSchemas.password,
    firstName: z
        .string()
        .min(1, "First name is required")
        .max(100, "First name too long")
        .transform(sanitize.string),
    lastName: z
        .string()
        .min(1, "Last name is required")
        .max(100, "Last name too long")
        .transform(sanitize.string),
    role: UserRoleEnum,
    restaurantId: validationSchemas.id.optional(),
});

export const LoginInputSchema = z.object({
    email: validationSchemas.email,
    password: z.string().min(1, "Password is required").transform(sanitize.string),
});

/**
 * Menu Input Schemas
 */
export const CreateMenuItemInputSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(1000, "Description too long").optional(),
    price: validationSchemas.positiveNumber,
    category: z.string().min(1, "Category is required").max(100, "Category too long"),
    imageUrl: z.url("Invalid image URL").optional().or(z.literal("")),
    restaurantId: validationSchemas.id,
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
    paymentMethodId: validationSchemas.id.optional(),
});

/**
 * Restaurant Input Schemas
 */
export const CreateRestaurantInputSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    description: z.string().max(2000, "Description too long").optional(),
    address: z.string().min(1, "Address is required").max(500, "Address too long"),
    city: z.string().min(1, "City is required").max(100, "City too long"),
    location: z
        .string()
        .min(1, "Location is required")
        .max(200, "Location too long")
        .transform(sanitize.string),
    phone: validationSchemas.phone.optional().or(z.literal("")),
    email: validationSchemas.email.optional().or(z.literal("")),
    isActive: z.boolean().optional(),
});

/**
 * Feedback Input Schema
 * Accepts a message and optional email address. Message is sanitized and required.
 */
export const CreateFeedbackInputSchema = z.object({
    message: validationSchemas.safeHtml,
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
    role: UserRoleEnum.optional(),
    email: validationSchemas.email.optional(),
    password: validationSchemas.password.optional(),
    firstName: z
        .string()
        .min(1, "First name is required")
        .max(100, "First name too long")
        .transform(sanitize.string)
        .optional(),
    lastName: z
        .string()
        .min(1, "Last name is required")
        .max(100, "Last name too long")
        .transform(sanitize.string)
        .optional(),
    restaurantId: validationSchemas.id.optional(),
    isActive: z.boolean().optional(),
});
