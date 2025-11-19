import { createClient } from "redis";
import "dotenv/config";

async function clearRedisCache() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    const client = createClient({ url: redisUrl });

    try {
        await client.connect();
        console.log("Connected to Redis");

        await client.flushDb();
        console.log("Redis cache cleared successfully");
    } catch (error) {
        console.error("Error clearing Redis cache:", error);
        process.exit(1);
    } finally {
        await client.disconnect();
    }
}

clearRedisCache();
