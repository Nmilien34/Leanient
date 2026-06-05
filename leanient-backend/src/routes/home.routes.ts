import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getTodaysFocus } from "../services/todaysFocus.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/focus",
  asyncHandler(async (req, res) => {
    sendData(res, await getTodaysFocus(req.user!.id));
  }),
);

export default router;
