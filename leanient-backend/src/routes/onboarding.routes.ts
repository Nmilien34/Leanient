import { Router } from "express";
import { onboardingCompleteRequestSchema, type OnboardingCompleteRequest } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { completeOnboarding } from "../services/onboarding.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/complete",
  validateBody(onboardingCompleteRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as OnboardingCompleteRequest;
    const result = await completeOnboarding(req.user!.id, body);
    sendData(res, result, 201);
  }),
);

export default router;
