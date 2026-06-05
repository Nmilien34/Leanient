import {
  computeWeeklyWorkoutTarget,
  inferEquipmentAccessFromTrainingStatus,
  type EquipmentAccess,
  type TrainingStatus,
} from "@leanient/shared";

export { computeWeeklyWorkoutTarget, inferEquipmentAccessFromTrainingStatus };

export function normalizeProfileTrainingFields(input: {
  trainingStatus: TrainingStatus;
  equipmentAccess?: EquipmentAccess;
  weeklyWorkoutTarget?: number;
}): {
  equipmentAccess: EquipmentAccess;
  weeklyWorkoutTarget: number;
} {
  return {
    equipmentAccess: input.equipmentAccess ?? inferEquipmentAccessFromTrainingStatus(input.trainingStatus),
    weeklyWorkoutTarget: computeWeeklyWorkoutTarget(input.trainingStatus),
  };
}
