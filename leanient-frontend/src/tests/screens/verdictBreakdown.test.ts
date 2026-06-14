import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { buildVerdictBreakdown } from "../../screens/app/verdictBreakdown";

function snap(overrides: Partial<MuscleRetentionSnapshot>): MuscleRetentionSnapshot {
  return {
    id: "s",
    userId: "u",
    weekOf: "2026-06-01T00:00:00.000Z",
    proteinScore: 85,
    trainingScore: 60,
    paceScore: 90,
    muscleRetentionScore: 74,
    retentionLabel: "maintaining",
    weeklyWeightLossLb: 1.2,
    cumulativeWeightLossLb: 8,
    inputsUsed: {} as MuscleRetentionSnapshot["inputsUsed"],
    engineVersion: "v1.0",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildVerdictBreakdown", () => {
  it("returns null without any snapshots", () => {
    expect(buildVerdictBreakdown([])).toBeNull();
  });

  it("surfaces the latest component scores and flags the weakest lever", () => {
    const view = buildVerdictBreakdown([snap({})])!;
    expect(view.retention).toBe(74);
    expect(view.components.map((c) => [c.key, c.score])).toEqual([
      ["protein", 85],
      ["training", 60],
      ["pace", 90],
    ]);
    expect(view.weakest.key).toBe("training");
    expect(view.weakestLine).toBe("Training is the lever to pull this week.");
  });

  it("uses the most recent week and reports the change from the week before", () => {
    const view = buildVerdictBreakdown([
      snap({ weekOf: "2026-06-08T00:00:00.000Z", muscleRetentionScore: 78 }),
      snap({ weekOf: "2026-06-01T00:00:00.000Z", muscleRetentionScore: 70 }),
    ])!;
    expect(view.retention).toBe(78); // latest by weekOf, regardless of input order
    expect(view.retentionDelta).toBe(8);
  });

  it("drops the nudge when every lever is strong", () => {
    const view = buildVerdictBreakdown([snap({ proteinScore: 90, trainingScore: 88, paceScore: 100 })])!;
    expect(view.weakestLine).toBeNull();
    expect(view.retentionDelta).toBeNull(); // single week
  });
});
