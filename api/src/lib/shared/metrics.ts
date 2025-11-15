import express from "express";
import { register } from "../../metrics";
import { logger } from "./logger";

export const createMetricsRouter = () => {
    const router = express.Router();

    // Metrics endpoint for Prometheus
    router.get("/", async (req, res) => {
        try {
            res.set("Content-Type", register.contentType);
            const metrics = await register.metrics();
            res.end(metrics);
        } catch (error) {
            logger.error("Metrics collection failed", error);
            res.status(500).end();
        }
    });

    return router;
};
