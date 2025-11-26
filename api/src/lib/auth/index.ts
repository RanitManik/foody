import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../database";
import { logger } from "../shared/logger";
import type { users as User } from "@prisma/client";

function getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is required");
    }
    return secret;
}

/**
 * Decode JWT token and fetch user
 * Returns null for invalid/expired tokens (never throws for auth failures)
 * Only throws on fatal errors like DB connection issues
 */
export async function getUserFromToken(token?: string | null): Promise<User | null> {
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, getJWTSecret()) as unknown as { userId: string };
        const user = await prisma.users.findUnique({
            where: { id: decoded.userId },
        });
        return user;
    } catch (error) {
        // Log in dev to help with debugging, but don't leak details in prod
        logger.debug("Token verification failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Extract token from various header/param formats
 * Handles: "Bearer xyz", Authorization header, authToken param, token param
 * Case-insensitive and strips Bearer prefix
 */
export function extractToken(input: {
    authHeader?: string;
    connectionParams?: Record<string, unknown>;
}): string | null {
    const { authHeader, connectionParams } = input;

    // From HTTP Authorization header
    if (authHeader) {
        const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        if (raw) {
            return raw.replace(/^Bearer\s+/i, "").trim() || null;
        }
    }

    // From WebSocket connection params (case-insensitive)
    if (connectionParams) {
        const raw =
            (connectionParams["authorization"] as string) ||
            (connectionParams["Authorization"] as string) ||
            (connectionParams["authToken"] as string) ||
            (connectionParams["token"] as string);

        if (raw) {
            return raw.replace(/^Bearer\s+/i, "").trim() || null;
        }
    }

    return null;
}

/**
 * Generate JWT token
 * Token expiration can be configured via JWT_EXPIRES_IN env var (default: 7d)
 * Examples: "7d", "24h", "1h", "3600s"
 */
export function generateToken(userId: string): string {
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign({ userId }, getJWTSecret(), options);
}
