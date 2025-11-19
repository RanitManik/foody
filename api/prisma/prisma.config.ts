import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "schema.prisma",
    migrations: {
        path: "migrations",
        seed: "tsx ../scripts/database/seed.ts",
    },
    datasource: {
        url: env("DATABASE_URL"),
    },
});
