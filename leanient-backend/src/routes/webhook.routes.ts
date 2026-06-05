import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import {
  assertRevenueCatWebhookAuthorization,
  handleRevenueCatWebhook,
  type RevenueCatWebhookPayload,
} from "../services/revenueCat.service";

const router = Router();

router.post(
  "/revenuecat",
  asyncHandler(async (req, res) => {
    assertRevenueCatWebhookAuthorization(req.get("authorization"));
    const result = await handleRevenueCatWebhook(req.body as RevenueCatWebhookPayload);
    sendData(res, result);
  }),
);

export default router;
