import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getProgressOverview } from "../services/muscleRetention.service";

const router = Router();

router.use(requireAuth);

function parseWeeks(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : 12;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 12;
  }

  return Math.min(parsed, 52);
}

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    sendData(res, await getProgressOverview(req.user!.id, parseWeeks(req.query.weeks)));
  }),
);

export default router;
