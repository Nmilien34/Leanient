import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getTrainingToday } from "../services/training.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/today",
  asyncHandler(async (req, res) => {
    sendData(res, await getTrainingToday(req.user!.id));
  }),
);

export default router;
