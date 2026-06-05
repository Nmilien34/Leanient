import type { CreateMealLogRequest, MealLog, PatchMealLogRequest } from "@leanient/shared";
import { MealLogModel, type MealLogDocument } from "../models/mealLog.model";
import { serializeMealLog } from "./serializers";
import { createDailyLogService } from "./logCrud.service";

export const mealLogService = createDailyLogService<
  MealLogDocument,
  CreateMealLogRequest,
  PatchMealLogRequest,
  MealLog
>({
  model: MealLogModel,
  serialize: serializeMealLog,
  name: "Meal log",
});
