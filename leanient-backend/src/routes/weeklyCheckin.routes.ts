import { Router } from "express";
import { weeklyCheckinRequestSchema, type WeeklyCheckinRequest } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { submitWeeklyCheckin } from "../services/weeklyCheckin.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  validateBody(weeklyCheckinRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as WeeklyCheckinRequest;
    const result = await submitWeeklyCheckin(req.user!.id, body);
    sendData(res, result, 201);
  }),
);

export default router;
