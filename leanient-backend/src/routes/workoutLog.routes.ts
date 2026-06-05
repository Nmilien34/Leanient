import { createWorkoutLogRequestSchema, patchWorkoutLogRequestSchema } from "@leanient/shared";
import { workoutLogService } from "../services/workoutLog.service";
import { createLogRouter } from "./logRoutes.factory";

export default createLogRouter({
  createSchema: createWorkoutLogRequestSchema,
  patchSchema: patchWorkoutLogRequestSchema,
  service: workoutLogService,
});
