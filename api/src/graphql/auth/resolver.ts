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

export const authResolvers = {
    Mutation: {
        register: async (_parent: unknown, { input }: { input: RegisterInput }) => {
            try {
                // Validate and sanitize input
                const validated = validateInput(RegisterInputSchema, input);
                const email = validateEmail(validated.email);
                const { password, firstName, lastName, role, country } = validated;

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
                        country,
                    },
                });

                // Generate JWT token
                const token = generateToken(user.id);

                logger.info("User registered successfully", {
                    userId: user.id,
                    email: email,
                    role: user.role,
                });

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
        me: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
            if (!context.user) {
                throw GraphQLErrors.unauthenticated();
            }
            return context.user;
        },
    },
};
