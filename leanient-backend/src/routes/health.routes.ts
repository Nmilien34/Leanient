import { Router } from "express";
import { ERROR_CODES } from "@leanient/shared";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";

export function createHealthRouter(healthCheck: () => Promise<boolean>): Router {
  const router = Router();

  router.get(
    "/healthz",
    asyncHandler(async (_req, res) => {
      const healthy = await healthCheck();

      if (!healthy) {
        throw new AppError({
          code: ERROR_CODES.databaseUnavailable,
          message: "Database is not reachable",
          statusCode: 503,
        });
      }

      sendData(res, {
        status: "ok",
        db: "connected",
        service: "leanient-backend",
      });
    }),
  );

  return router;
}
