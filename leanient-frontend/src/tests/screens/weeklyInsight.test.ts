import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { buildWeeklyInsight } from "../../screens/app/weeklyInsight";

function snap(weekOf: string, scores: { muscle: number; protein: number; training: number }): MuscleRetentionSnapshot {
  return {
    id: weekOf,
    userId: "u",
    weekOf,
    proteinScore: scores.protein,
    trainingScore: scores.training,
    paceScore: 80,
    muscleRetentionScore: scores.muscle,
    retentionLabel: "maintaining",
    weeklyWeightLossLb: 1.2,
    cumulativeWeightLossLb: 8,
    inputsUsed: {} as MuscleRetentionSnapshot["inputsUsed"],
    engineVersion: "v1.0",
    createdAt: weekOf,
    updatedAt: weekOf,
  };
}

describe("buildWeeklyInsight", () => {
  it("returns null with no snapshots", () => {
    expect(buildWeeklyInsight([])).toBeNull();
  });

  it("gives a first-week read with a single snapshot", () => {
    const i = buildWeeklyInsight([snap("2026-06-01", { muscle: 70, protein: 70, training: 70 })])!;
    expect(i.headline).toMatch(/first week/i);
  });

  it("celebrates a climbing muscle score (compares latest vs prior by weekOf)", () => {
    const i = buildWeeklyInsight([
      snap("2026-06-08", { muscle: 82, protein: 85, training: 80 }),
      snap("2026-06-01", { muscle: 72, protein: 80, training: 78 }),
    ])!;
    expect(i.tone).toBe("win");
    expect(i.headline).toContain("10 points");
  });

  it("flags a slipping muscle score", () => {
    const i = buildWeeklyInsight([
      snap("2026-06-01", { muscle: 82, protein: 85, training: 80 }),
      snap("2026-06-08", { muscle: 72, protein: 84, training: 79 }),
    ])!;
    expect(i.tone).toBe("watch");
    expect(i.headline).toContain("10 points");
  });

  it("names a strong protein week when muscle is flat but protein jumped", () => {
    const i = buildWeeklyInsight([
      snap("2026-06-01", { muscle: 78, protein: 65, training: 80 }),
      snap("2026-06-08", { muscle: 80, protein: 88, training: 80 }),
    ])!;
    expect(i.headline).toMatch(/protein/i);
    expect(i.tone).toBe("win");
  });

  it("flags training easing off", () => {
    const i = buildWeeklyInsight([
      snap("2026-06-01", { muscle: 80, protein: 82, training: 85 }),
      snap("2026-06-08", { muscle: 79, protein: 81, training: 70 }),
    ])!;
    expect(i.headline).toMatch(/training/i);
    expect(i.tone).toBe("watch");
  });

  it("calls a flat week steady", () => {
    const i = buildWeeklyInsight([
      snap("2026-06-01", { muscle: 80, protein: 82, training: 80 }),
      snap("2026-06-08", { muscle: 81, protein: 83, training: 81 }),
    ])!;
    expect(i.headline).toMatch(/steady/i);
  });
});
