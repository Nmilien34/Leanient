import type { CreateWorkoutLogRequest, PatchWorkoutLogRequest, WorkoutLog } from "@leanient/shared";
import { WorkoutModel } from "../models/workout.model";
import { WorkoutLogModel, type WorkoutLogDocument } from "../models/workoutLog.model";
import { createDailyLogService } from "./logCrud.service";
import { serializeWorkoutLog } from "./serializers";

const baseWorkoutLogService = createDailyLogService<
  WorkoutLogDocument,
  CreateWorkoutLogRequest,
  PatchWorkoutLogRequest,
  WorkoutLog
>({
  model: WorkoutLogModel,
  serialize: serializeWorkoutLog,
  name: "Workout log",
});

async function withCountsAsResistanceDefault(
  body: CreateWorkoutLogRequest,
): Promise<CreateWorkoutLogRequest> {
  if (typeof body.countsAsResistance === "boolean") {
    return body;
  }

  if (body.workoutId) {
    const workout = await WorkoutModel.findById(body.workoutId);
    return {
      ...body,
      countsAsResistance: workout?.category === "strength",
    };
  }

  const name = body.customWorkoutName?.toLowerCase() ?? "";
  return {
    ...body,
    countsAsResistance: name.includes("resistance") || name.includes("strength"),
  };
}

export const workoutLogService = {
  ...baseWorkoutLogService,
  async create(userId: string, body: CreateWorkoutLogRequest): Promise<WorkoutLog> {
    return baseWorkoutLogService.create(userId, await withCountsAsResistanceDefault(body));
  },
};
