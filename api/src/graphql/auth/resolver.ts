/**
 * @fileoverview Authentication Resolvers
 * @module graphql/auth/resolver
 * @description Handles user authentication operations including registration, login, and user session management.
 * Implements secure password hashing, JWT token generation, and comprehensive validation.
 *
 * @security
 * - Passwords are hashed using bcryptjs with salt rounds of 12
 * - JWT tokens are generated for authenticated sessions
 * - Email validation and sanitization applied to all inputs
 * - Account status checks prevent inactive user access
 *
 * @author Ranit Kumar Manik
 * @version 1.0.0
 */

import bcrypt from "bcryptjs";
import { prisma } from "../../lib/database";
import { generateToken } from "../../lib/auth";
import { logger } from "../../lib/shared/logger";
import { GraphQLErrors } from "../../lib/shared/errors";
import {
    validateInput,
    RegisterInputSchema,
    LoginInputSchema,
    validateEmail,
} from "../../lib/shared/validation";
import { GraphQLContext, RegisterInput, LoginInput } from "../../types/graphql";
import { deleteCacheByPattern } from "../../lib/shared/cache";
import { UserRole } from "@prisma/client";

export const authResolvers = {
    Mutation: {
        /**
         * Register a new user account
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {RegisterInput} params.input - User registration data
         * @returns {Promise<{token: string, user: User}>} JWT token and user object
         *
         * @throws {GraphQLError} BAD_INPUT - If user already exists or validation fails
         * @throws {GraphQLError} INTERNAL_SERVER_ERROR - If registration process fails
         *
         * @description
         * Creates a new user account with the following workflow:
         * 1. Validates and sanitizes all input fields
         * 2. Checks for existing user with same email
         * 3. Hashes password with bcrypt (12 salt rounds)
         * 4. Creates user record in database
         * 5. Generates JWT authentication token
         * 6. Logs successful registration with user metadata
         *
         * @example
         * mutation {
         *   register(input: {
         *     email: "user@example.com",
         *     password: "SecurePass123",
         *     firstName: "John",
         *     lastName: "Doe",
         *     role: "MEMBER",
         *     assignedLocation: "spice-garden-bangalore"
         *   }) {
         *     token
         *     user { id email role }
         *   }
         * }
         */
        register: async (
            _parent: unknown,
            { input }: { input: RegisterInput },
            context: GraphQLContext,
        ) => {
            try {
                if (!context.user || context.user.role !== UserRole.ADMIN) {
                    logger.warn("Registration failed: admin authentication required", {
                        requestedBy: context.user?.id,
                        requestedRole: context.user?.role,
                    });
                    throw GraphQLErrors.forbidden("Only admins can register new users");
                }

                // Validate and sanitize input
                const validated = validateInput(RegisterInputSchema, input);
                const email = validateEmail(validated.email);
                const { password, firstName, lastName, role, assignedLocation } = validated;

                if (role === UserRole.ADMIN) {
                    logger.warn("Registration failed: attempted admin creation via register", {
                        email,
                    });
                    throw GraphQLErrors.badInput("Admin accounts must be provisioned manually");
                }

                if (!assignedLocation) {
                    throw GraphQLErrors.badInput("Assigned location is required for new users");
                }

                // Check if user already exists
                const existingUser = await prisma.users.findUnique({
                    where: { email },
                });

                if (existingUser) {
                    logger.warn("Registration failed: user already exists", { email });
                    throw GraphQLErrors.badInput("User already exists");
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 12);

                // Create user
                const user = await prisma.users.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        role,
                        assignedLocation,
                    },
                });

                // Generate JWT token
                const token = generateToken(user.id);

                logger.info("User registered successfully", {
                    userId: user.id,
                    email: email,
                    role: user.role,
                });

                // Invalidate user caches since a new user was added
                await deleteCacheByPattern("user:*");

                return {
                    token,
                    user,
                };
            } catch (error) {
                const emailForLog = input?.email || "unknown";
                logger.error("Registration failed", {
                    email: emailForLog,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },

        /**
         * Authenticate a user and generate session token
         *
         * @async
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {Object} params - Mutation parameters
         * @param {LoginInput} params.input - User login credentials
         * @returns {Promise<{token: string, user: User}>} JWT token and user object
         *
         * @throws {GraphQLError} BAD_INPUT - If credentials are invalid
         * @throws {GraphQLError} FORBIDDEN - If user account is inactive
         * @throws {GraphQLError} INTERNAL_SERVER_ERROR - If login process fails
         *
         * @description
         * Authenticates user credentials and creates session with the following steps:
         * 1. Validates and sanitizes email and password inputs
         * 2. Retrieves user record by email
         * 3. Verifies user account is active
         * 4. Compares password hash using bcrypt
         * 5. Generates new JWT token for session
         * 6. Logs successful authentication with user metadata
         *
         * @security
         * - Uses constant-time comparison for password verification
         * - Returns generic error message to prevent user enumeration
         * - Checks account active status before granting access
         * - All failed attempts are logged for security monitoring
         *
         * @example
         * mutation {
         *   login(input: {
         *     email: "user@example.com",
         *     password: "SecurePass123"
         *   }) {
         *     token
         *     user { id email role }
         *   }
         * }
         */
        login: async (_parent: unknown, { input }: { input: LoginInput }) => {
            try {
                // Validate and sanitize input
                const validated = validateInput(LoginInputSchema, input);
                const email = validateEmail(validated.email);
                const { password } = validated;

                // Find user and verify password
                const user = await prisma.users.findUnique({
                    where: { email },
                });

                if (!user) {
                    logger.warn("Login failed: user not found", { email });
                    throw GraphQLErrors.badInput("Invalid credentials");
                }

                // Check if user is active
                if (!user.isActive) {
                    logger.warn("Login failed: user account is inactive", {
                        email,
                        userId: user.id,
                    });
                    throw GraphQLErrors.forbidden("Account is inactive. Please contact support.");
                }

                // Check password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    logger.warn("Login failed: invalid password", { email, userId: user.id });
                    throw GraphQLErrors.badInput("Invalid credentials");
                }

                // Generate JWT token
                const token = generateToken(user.id);

                logger.info("User logged in successfully", {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                });

                return {
                    token,
                    user,
                };
            } catch (error) {
                const emailForLog = input?.email || "unknown";
                logger.error("Login failed", {
                    email: emailForLog,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    },

    Query: {
        /**
         * Get current authenticated user information
         *
         * @param {unknown} _parent - Parent resolver (unused)
         * @param {unknown} _args - Query arguments (unused)
         * @param {GraphQLContext} context - GraphQL execution context with authenticated user
         * @returns {User} Current authenticated user object
         *
         * @throws {GraphQLError} UNAUTHENTICATED - If no user is authenticated in context
         *
         * @description
         * Returns the currently authenticated user's profile information from the context.
         * Requires valid JWT token in Authorization header.
         *
         * @security
         * - User must be authenticated (valid JWT token required)
         * - Returns user object from verified token context
         *
         * @example
         * query {
         *   me {
         *     id
         *     email
         *     firstName
         *     lastName
         *     role
         *     assignedLocation
         *   }
         * }
         */
        me: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }
            return context.user;
        },
    },
};
