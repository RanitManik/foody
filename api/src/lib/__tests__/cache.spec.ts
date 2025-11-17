// Mock Redis
jest.mock("redis", () => ({
    createClient: jest.fn(),
}));

// Mock logger
jest.mock("../shared/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock metrics
jest.mock("../../metrics", () => ({
    cacheHitsTotal: {
        inc: jest.fn(),
    },
    cacheMissesTotal: {
        inc: jest.fn(),
    },
}));

import { createClient } from "redis";
import { logger } from "../shared/logger";
import { cacheHitsTotal, cacheMissesTotal } from "../../metrics";

// Import after mocks
import {
    initRedis,
    getRedisClient,
    createCacheKey,
    setCache,
    getCache,
    deleteCache,
    deleteCacheByPattern,
    withCache,
    clearCache,
    getCacheStats,
    closeRedis,
    resetRedisClient,
} from "../shared/cache";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockCacheHitsTotal = cacheHitsTotal as jest.Mocked<typeof cacheHitsTotal>;
const mockCacheMissesTotal = cacheMissesTotal as jest.Mocked<typeof cacheMissesTotal>;

describe("Cache Utilities", () => {
    const originalEnv = process.env;
    let mockRedisClient: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };

        // Reset the Redis client state
        resetRedisClient();

        mockRedisClient = {
            connect: jest.fn(),
            set: jest.fn(),
            setEx: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
            flushAll: jest.fn(),
            info: jest.fn(),
            quit: jest.fn(),
            isOpen: true,
            on: jest.fn(),
        };

        mockCreateClient.mockReturnValue(mockRedisClient);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("initRedis", () => {
        it("should initialize Redis client successfully", async () => {
            process.env.REDIS_URL = "redis://localhost:6379";

            // Mock the connect event
            mockRedisClient.connect.mockImplementation(() => {
                // Trigger the connect event by calling the handler directly
                const calls = mockRedisClient.on.mock.calls;
                for (const call of calls) {
                    if (call[0] === "connect" && typeof call[1] === "function") {
                        call[1]();
                        break;
                    }
                }
                return Promise.resolve();
            });

            await initRedis();

            expect(mockCreateClient).toHaveBeenCalledWith({
                url: "redis://localhost:6379",
            });
            expect(mockRedisClient.connect).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith("Connected to Redis");
        });

        it("should not reinitialize if already connected", async () => {
            await initRedis();
            await initRedis();

            expect(mockCreateClient).toHaveBeenCalledTimes(1);
        });

        it("should handle connection errors in production", async () => {
            process.env.NODE_ENV = "production";
            mockRedisClient.connect.mockRejectedValue(new Error("Connection failed"));

            await expect(initRedis()).rejects.toThrow("Connection failed");
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to connect to Redis",
                expect.any(Error),
            );
        });

        it("should continue without Redis in development on error", async () => {
            process.env.NODE_ENV = "development";
            mockRedisClient.connect.mockRejectedValue(new Error("Connection failed"));

            await expect(initRedis()).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to connect to Redis",
                expect.any(Error),
            );
        });
    });

    describe("getRedisClient", () => {
        it("should return Redis client after initialization", async () => {
            await initRedis();

            const client = getRedisClient();
            expect(client).toBe(mockRedisClient);
        });

        it("should return null if not initialized", () => {
            const client = getRedisClient();
            expect(client).toBeNull();
        });
    });

    describe("createCacheKey", () => {
        it("should create menuItems cache key", () => {
            expect(createCacheKey.menuItems()).toBe("menuItems:all");
            expect(createCacheKey.menuItems("restaurant-123")).toBe("menuItems:restaurant-123");
            expect(createCacheKey.menuItems({ restaurantId: "restaurant-123" })).toBe(
                "menuItems:restaurant-123",
            );
        });

        it("should create menuItem cache key", () => {
            expect(createCacheKey.menuItem("item-123")).toBe("menuItem:item-123");
        });

        it("should create restaurants cache key", () => {
            expect(createCacheKey.restaurants()).toBe("restaurants:all");
            expect(createCacheKey.restaurants("Midtown")).toBe("restaurants:Midtown");
            expect(createCacheKey.restaurants({ restaurantId: "restaurant-123" })).toBe(
                "restaurants:restaurant:restaurant-123",
            );
            expect(createCacheKey.restaurants({ location: "Downtown" })).toBe(
                "restaurants:location:Downtown",
            );
        });

        it("should create restaurant cache key", () => {
            expect(createCacheKey.restaurant("rest-123")).toBe("restaurant:rest-123");
        });

        it("should create user cache key", () => {
            expect(createCacheKey.user("user-123")).toBe("user:user-123");
        });
    });

    describe("setCache", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should set cache value without TTL", async () => {
            const key = "test-key";
            const value = { data: "test" };

            await setCache(key, value);

            expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
        });

        it("should set cache value with TTL", async () => {
            const key = "test-key";
            const value = { data: "test" };
            const ttl = 300;

            await setCache(key, value, ttl);

            expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.set.mockRejectedValue(new Error("Set failed"));

            await expect(setCache("test-key", "value")).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to set cache for key: test-key",
                expect.any(Error),
            );
        });

        it("should do nothing if Redis not connected", async () => {
            // Reset Redis client to simulate not connected
            resetRedisClient();

            await setCache("test-key", "value");

            expect(mockRedisClient.set).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe("getCache", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should get and parse cached value", async () => {
            const key = "test-key";
            const value = { data: "test" };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

            const result = await getCache(key);

            expect(result).toEqual(value);
            expect(mockRedisClient.get).toHaveBeenCalledWith(key);
        });

        it("should return null for non-existent key", async () => {
            mockRedisClient.get.mockResolvedValue(null);

            const result = await getCache("non-existent");

            expect(result).toBeNull();
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.get.mockRejectedValue(new Error("Get failed"));

            const result = await getCache("test-key");

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to get cache for key: test-key",
                expect.any(Error),
            );
        });

        it("should return null if Redis not connected", async () => {
            // Reset Redis client to simulate not connected
            resetRedisClient();

            const result = await getCache("test-key");

            expect(result).toBeNull();
            expect(mockRedisClient.get).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe("deleteCache", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should delete cache key", async () => {
            const key = "test-key";

            await deleteCache(key);

            expect(mockRedisClient.del).toHaveBeenCalledWith(key);
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.del.mockRejectedValue(new Error("Delete failed"));

            await expect(deleteCache("test-key")).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to delete cache for key: test-key",
                expect.any(Error),
            );
        });

        it("should do nothing if Redis not connected", async () => {
            // Reset Redis client to simulate not connected
            resetRedisClient();

            await deleteCache("test-key");

            expect(mockRedisClient.del).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe("deleteCacheByPattern", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should delete keys matching pattern", async () => {
            const pattern = "menuItems:*";
            const keys = ["menuItems:1", "menuItems:2"];
            mockRedisClient.keys.mockResolvedValue(keys);

            await deleteCacheByPattern(pattern);

            expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
            expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Invalidated 2 cache keys matching pattern: menuItems:*",
            );
        });

        it("should do nothing if no keys match", async () => {
            mockRedisClient.keys.mockResolvedValue([]);

            await deleteCacheByPattern("empty:*");

            expect(mockRedisClient.del).not.toHaveBeenCalled();
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.keys.mockRejectedValue(new Error("Keys failed"));

            await expect(deleteCacheByPattern("test:*")).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to delete cache by pattern: test:*",
                expect.any(Error),
            );
        });
    });

    describe("withCache", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should return cached value on cache hit", async () => {
            const key = "test-key";
            const cachedValue = { data: "cached" };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

            const fn = jest.fn();
            const result = await withCache(key, fn);

            expect(result).toEqual(cachedValue);
            expect(fn).not.toHaveBeenCalled();
            expect(mockCacheHitsTotal.inc).toHaveBeenCalledWith({ cache_type: "redis" });
            expect(mockLogger.debug).toHaveBeenCalledWith("Cache hit for key: test-key");
        });

        it("should execute function and cache result on cache miss", async () => {
            const key = "test-key";
            const freshValue = { data: "fresh" };
            const fn = jest.fn().mockResolvedValue(freshValue);
            mockRedisClient.get.mockResolvedValue(null);

            const result = await withCache(key, fn, 300);

            expect(result).toEqual(freshValue);
            expect(fn).toHaveBeenCalled();
            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                key,
                300,
                JSON.stringify(freshValue),
            );
            expect(mockCacheMissesTotal.inc).toHaveBeenCalledWith({ cache_type: "redis" });
            expect(mockLogger.debug).toHaveBeenCalledWith("Cache miss for key: test-key");
        });
    });

    describe("clearCache", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should clear all cache", async () => {
            await clearCache();

            expect(mockRedisClient.flushAll).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith("Cache cleared");
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.flushAll.mockRejectedValue(new Error("Flush failed"));

            await expect(clearCache()).resolves.not.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to clear cache",
                expect.any(Error),
            );
        });
    });

    describe("getCacheStats", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should return cache stats", async () => {
            const mockInfo = "redis_version:6.2.6\nconnected_clients:5\n";
            mockRedisClient.info.mockResolvedValue(mockInfo);

            const stats = await getCacheStats();

            expect(stats).toEqual({
                connected: true,
                info: mockInfo,
            });
            expect(mockRedisClient.info).toHaveBeenCalled();
        });

        it("should handle errors gracefully", async () => {
            mockRedisClient.info.mockRejectedValue(new Error("Info failed"));

            const stats = await getCacheStats();

            expect(stats).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Failed to get cache stats",
                expect.any(Error),
            );
        });

        it("should return null if Redis not connected", async () => {
            // Reset Redis client to simulate not connected
            resetRedisClient();

            const stats = await getCacheStats();

            expect(stats).toBeNull();
            expect(mockRedisClient.info).not.toHaveBeenCalled();
        });
    });

    describe("closeRedis", () => {
        beforeEach(async () => {
            await initRedis();
        });

        it("should close Redis connection", async () => {
            await closeRedis();

            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith("Redis connection closed");
        });

        it("should do nothing if not connected", async () => {
            // Reset Redis client to simulate not connected
            resetRedisClient();

            await expect(closeRedis()).resolves.not.toThrow();
            expect(mockRedisClient.quit).not.toHaveBeenCalled();
        });
    });
});
