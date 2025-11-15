import { createClient, RedisClientType } from "redis";
import { logger } from "./logger";
import { cacheHitsTotal, cacheMissesTotal } from "../../metrics";

// Redis client instance
let redisClient: RedisClientType | null = null;

// Reset Redis client (for testing)
export const resetRedisClient = (): void => {
    redisClient = null;
};

// Initialize Redis client
export const initRedis = async (): Promise<void> => {
    if (redisClient) return;

    try {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

        redisClient = createClient({
            url: redisUrl,
        });

        redisClient.on("error", (err) => {
            logger.error("Redis Client Error", err);
        });

        redisClient.on("connect", () => {
            logger.info("Connected to Redis");
        });

        await redisClient.connect();
    } catch (error) {
        logger.error("Failed to connect to Redis", error);
        // Continue without Redis in development
        if (process.env.NODE_ENV === "production") {
            throw error;
        }
    }
};

// Get Redis client
export const getRedisClient = (): RedisClientType | null => {
    return redisClient;
};

// Cache key generators
export const createCacheKey = {
    menuItems: (restaurantId?: string) => `menuItems:${restaurantId || "all"}`,
    menuItem: (id: string) => `menuItem:${id}`,
    restaurants: (country?: string) => `restaurants:${country || "all"}`,
    restaurant: (id: string) => `restaurant:${id}`,
    user: (id: string) => `user:${id}`,
};

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
    MENU_ITEMS: 600, // 10 minutes - frequently changing menu data
    RESTAURANTS: 1800, // 30 minutes - moderately changing restaurant data
    ORDERS: 1800, // 30 minutes - order status changes frequently
    USER_DATA: 3600, // 1 hour - user profile data changes less frequently
    STATIC_DATA: 86400, // 24 hours - rarely changing reference data
};

// Set cache value
export const setCache = async (key: string, value: unknown, ttlSeconds?: number): Promise<void> => {
    if (!redisClient) return;

    try {
        const serializedValue = JSON.stringify(value);
        if (ttlSeconds) {
            await redisClient.setEx(key, ttlSeconds, serializedValue);
        } else {
            await redisClient.set(key, serializedValue);
        }
    } catch (error) {
        logger.error(`Failed to set cache for key: ${key}`, error);
    }
};

// Get cache value
export const getCache = async <T>(key: string): Promise<T | null> => {
    if (!redisClient) return null;

    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        logger.error(`Failed to get cache for key: ${key}`, error);
        return null;
    }
};

// Delete cache key
export const deleteCache = async (key: string): Promise<void> => {
    if (!redisClient) return;

    try {
        await redisClient.del(key);
    } catch (error) {
        logger.error(`Failed to delete cache for key: ${key}`, error);
    }
};

// Delete cache keys by pattern
export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
    if (!redisClient) return;

    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            logger.debug(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
        }
    } catch (error) {
        logger.error(`Failed to delete cache by pattern: ${pattern}`, error);
    }
};

// Cache wrapper for async functions
export const withCache = async <T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds?: number,
    cacheType = "redis",
): Promise<T> => {
    // Try to get from cache first
    const cached = await getCache<T>(key);
    if (cached !== null) {
        cacheHitsTotal.inc({ cache_type: cacheType });
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
    }

    // Cache miss - execute function and cache result
    cacheMissesTotal.inc({ cache_type: cacheType });
    logger.debug(`Cache miss for key: ${key}`);
    const result = await fn();
    await setCache(key, result, ttlSeconds);
    return result;
};

// Clear all cache
export const clearCache = async (): Promise<void> => {
    if (!redisClient) return;

    try {
        await redisClient.flushAll();
        logger.info("Cache cleared");
    } catch (error) {
        logger.error("Failed to clear cache", error);
    }
};

// Get cache stats
export const getCacheStats = async () => {
    if (!redisClient) return null;

    try {
        const info = await redisClient.info();
        return {
            connected: redisClient.isOpen,
            info: info,
        };
    } catch (error) {
        logger.error("Failed to get cache stats", error);
        return null;
    }
};

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info("Redis connection closed");
    }
};
