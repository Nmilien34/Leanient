import { createMealLogRequestSchema, patchMealLogRequestSchema } from "@leanient/shared";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData } from "../lib/responses";
import { mealLogService } from "../services/mealLog.service";
import { getMealLogScanDetail } from "../services/mealScan.service";
import { createLogRouter } from "./logRoutes.factory";

const router = createLogRouter({
  createSchema: createMealLogRequestSchema,
  patchSchema: patchMealLogRequestSchema,
  service: mealLogService,
});

// The scan artifacts behind a logged meal (photo view URL + the coach's
// confirm-time callout). requireAuth is already applied by the factory.
router.get(
  "/:id/scan",
  asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    sendData(res, await getMealLogScanDetail(req.user!.id, id));
  }),
);

export default router;
