import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { bandForScore, buildRetentionHero } from "../../screens/app/retentionHero";

function snap(weekOf: string, muscleRetentionScore: number): MuscleRetentionSnapshot {
  return {
    id: weekOf,
    userId: "u",
    weekOf,
    proteinScore: 85,
    trainingScore: 60,
    paceScore: 90,
    muscleRetentionScore,
    retentionLabel: "maintaining",
    weeklyWeightLossLb: 1.2,
    cumulativeWeightLossLb: 8,
    inputsUsed: {} as MuscleRetentionSnapshot["inputsUsed"],
    engineVersion: "v1.0",
    createdAt: weekOf,
    updatedAt: weekOf,
  };
}

describe("bandForScore", () => {
  it("maps the score to the verdict bands", () => {
    expect(bandForScore(88)).toBe("on_track");
    expect(bandForScore(80)).toBe("on_track");
    expect(bandForScore(70)).toBe("drifting");
    expect(bandForScore(55)).toBe("drifting");
    expect(bandForScore(40)).toBe("losing");
  });
});

describe("buildRetentionHero", () => {
  it("returns null without snapshots", () => {
    expect(buildRetentionHero([])).toBeNull();
  });

  it("adds band, status, and an ordered trend on top of the breakdown", () => {
    const hero = buildRetentionHero([
      snap("2026-05-25T00:00:00.000Z", 70),
      snap("2026-06-08T00:00:00.000Z", 88),
      snap("2026-06-01T00:00:00.000Z", 79),
    ])!;
    expect(hero.retention).toBe(88); // latest by weekOf
    expect(hero.retentionDelta).toBe(9); // 88 - 79 (prior week)
    expect(hero.band).toBe("on_track");
    expect(hero.statusLabel).toBe("On track");
    expect(hero.trend).toEqual([70, 79, 88]); // sorted oldest → newest
    expect(hero.components.map((c) => c.key)).toEqual(["protein", "training", "pace"]);
  });
});
