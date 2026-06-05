import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getLatestWeeklyVerdict } from "../services/weeklyCheckin.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/latest",
  asyncHandler(async (req, res) => {
    sendData(res, await getLatestWeeklyVerdict(req.user!.id));
  }),
);

export default router;
