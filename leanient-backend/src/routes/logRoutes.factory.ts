import { Router } from "express";
import type { z } from "zod";
import { logListQuerySchema } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { ValidationError } from "../lib/errors";
import { validateBody } from "../middleware/validate.middleware";
import type { DailyLogService } from "../services/logCrud.service";

interface LogRouterConfig<TCreate, TPatch, TResponse> {
  createSchema: z.ZodType<TCreate>;
  patchSchema: z.ZodType<TPatch>;
  service: DailyLogService<TCreate, TPatch, TResponse>;
}

function paramId(id: string | string[] | undefined): string {
  return Array.isArray(id) ? id[0] : String(id);
}

export function createLogRouter<TCreate, TPatch, TResponse>(
  config: LogRouterConfig<TCreate, TPatch, TResponse>,
) {
  const router = Router();

  router.use(requireAuth);

  router.post(
    "/",
    validateBody(config.createSchema),
    asyncHandler(async (req, res) => {
      const result = await config.service.create(req.user!.id, req.body as TCreate);
      sendData(res, result, 201);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = logListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        throw new ValidationError("Invalid query parameters", parsed.error.flatten());
      }

      const result = await config.service.list(req.user!.id, parsed.data);
      sendData(res, result);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const result = await config.service.getById(req.user!.id, paramId(req.params.id));
      sendData(res, result);
    }),
  );

  router.patch(
    "/:id",
    validateBody(config.patchSchema),
    asyncHandler(async (req, res) => {
      const result = await config.service.update(
        req.user!.id,
        paramId(req.params.id),
        req.body as TPatch,
      );
      sendData(res, result);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const result = await config.service.softDelete(req.user!.id, paramId(req.params.id));
      sendData(res, result);
    }),
  );

  return router;
}
