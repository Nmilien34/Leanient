import { createMealLogRequestSchema, patchMealLogRequestSchema } from "@leanient/shared";
import { mealLogService } from "../services/mealLog.service";
import { createLogRouter } from "./logRoutes.factory";

export default createLogRouter({
  createSchema: createMealLogRequestSchema,
  patchSchema: patchMealLogRequestSchema,
  service: mealLogService,
});
