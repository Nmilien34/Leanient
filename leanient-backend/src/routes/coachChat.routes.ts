import { Router } from "express";
import { coachChatRequestSchema, type CoachChatRequestBody } from "@leanient/shared";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { validateBody } from "../middleware/validate.middleware";
import { getCoachChatReply } from "../services/coachChat.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/chat",
  validateBody(coachChatRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CoachChatRequestBody;
    sendData(res, await getCoachChatReply(req.user!.id, body.messages));
  }),
);

export default router;
