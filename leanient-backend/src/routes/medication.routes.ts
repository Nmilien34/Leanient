import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { listMedicationCatalog } from "../services/medication.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendData(res, await listMedicationCatalog());
  }),
);

export default router;
