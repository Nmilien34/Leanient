import { Router } from "express";
import { createWeightLogRequestSchema, type CreateWeightLogRequest } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { createManualWeightLog, listWeightLogs } from "../services/weightLog.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  validateBody(createWeightLogRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateWeightLogRequest;
    const weightLog = await createManualWeightLog(req.user!.id, body);
    sendData(res, weightLog, 201);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    sendData(res, await listWeightLogs(req.user!.id));
  }),
);

export default router;
