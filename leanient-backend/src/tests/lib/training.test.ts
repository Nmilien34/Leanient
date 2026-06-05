import type { TrainingStatus } from "@leanient/shared";
import { describe, expect, it } from "vitest";
import {
  computeWeeklyWorkoutTarget,
  inferEquipmentAccessFromTrainingStatus,
} from "../../lib/training";

describe("training helpers", () => {
  it.each<[TrainingStatus, number]>([
    ["not_training", 2],
    ["beginner", 2],
    ["consistent", 3],
    ["returning", 3],
  ])("computes weekly workout target for %s", (trainingStatus, expectedTarget) => {
    expect(computeWeeklyWorkoutTarget(trainingStatus)).toBe(expectedTarget);
  });

  it.each<[TrainingStatus, string]>([
    ["not_training", "bodyweight_only"],
    ["beginner", "bodyweight_only"],
    ["consistent", "dumbbells"],
    ["returning", "full_gym"],
  ])("infers equipment access for %s", (trainingStatus, expectedEquipment) => {
    expect(inferEquipmentAccessFromTrainingStatus(trainingStatus)).toBe(expectedEquipment);
  });
});
