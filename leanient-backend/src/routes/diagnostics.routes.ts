import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { getStallDiagnostic } from "../services/stallDiagnostic.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/stall",
  asyncHandler(async (req, res) => {
    sendData(res, await getStallDiagnostic(req.user!.id));
  }),
);

export default router;
