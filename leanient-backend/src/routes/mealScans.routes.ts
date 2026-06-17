import { Router } from "express";
import { mealParseRequestSchema, mealScanRequestSchema, type MealParseRequestBody, type MealScanRequestBody } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { analyzeMealScan, parseMealText } from "../services/mealScan.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/analyze",
  validateBody(mealScanRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as MealScanRequestBody;
    sendData(res, await analyzeMealScan(req.user!.id, body));
  }),
);

router.post(
  "/parse-text",
  validateBody(mealParseRequestSchema),
  asyncHandler(async (req, res) => {
    const { text } = req.body as MealParseRequestBody;
    sendData(res, await parseMealText(text));
  }),
);

export default router;
