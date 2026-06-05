import type { EquipmentAccess, TrainingStatus } from "../types";

// NOTE: daily protein/calorie targets are no longer computed here. The backend
// owns them via the Mifflin-St Jeor model (leanient-backend/src/lib/nutrition.ts)
// as the single source of truth, so the old `computeDailyTargets` heuristic was
// removed. Onboarding submits raw sex/age/height instead.

export function computeWeeklyWorkoutTarget(trainingStatus: TrainingStatus): number {
  switch (trainingStatus) {
    case "consistent":
    case "returning":
      return 3;
    case "not_training":
    case "beginner":
      return 2;
  }
}

export function inferEquipmentAccessFromTrainingStatus(
  trainingStatus: TrainingStatus,
): EquipmentAccess {
  switch (trainingStatus) {
    case "consistent":
      return "dumbbells";
    case "returning":
      return "full_gym";
    case "not_training":
    case "beginner":
      return "bodyweight_only";
  }
}
