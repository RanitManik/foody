import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Application } from "express";

export function setupRequestIdMiddleware(app: Application) {
    // ===== REQUEST ID MIDDLEWARE (FIRST) =====
    app.use((req: Request, res: Response, next: () => void) => {
        const requestId = (req.headers["x-request-id"] as string) || uuidv4();
        req.headers["x-request-id"] = requestId;
        res.setHeader("x-request-id", requestId);
        next();
    });
}
