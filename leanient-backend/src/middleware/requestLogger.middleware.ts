import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../lib/logger";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.get("x-request-id") ?? randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "[request] completed",
    );
  });

  next();
};
