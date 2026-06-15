import { describe, expect, it } from "vitest";
import { buildProjectedPath } from "../../screens/app/projectedPath";

const now = new Date(2026, 5, 2); // Jun 2 2026

describe("buildProjectedPath", () => {
  it("projects today→goal and sizes muscle-at-risk by drug", () => {
    const p = buildProjectedPath({
      currentWeight: 228,
      goalWeight: 180,
      goalWeightUnit: "lb",
      goalPace: "steady", // 1 lb/wk → 48 weeks
      medicationName: "Mounjaro", // tirzepatide → 0.25
      now,
    })!;
    expect(p.toLose).toBe(48);
    expect(p.startLabel).toBe("228 lb");
    expect(p.goalLabel).toBe("180 lb");
    expect(p.points[0]).toBe(228);
    expect(p.points[p.points.length - 1]).toBe(180); // lands on goal
    expect(p.muscleAtRisk).toBe(12); // 48 * 0.25
    expect(p.annotation).toContain("12 lb could be muscle");
  });

  it("uses the hedged fraction for an unknown drug", () => {
    const p = buildProjectedPath({ currentWeight: 200, goalWeight: 170, goalPace: "steady", now })!;
    expect(p.toLose).toBe(30);
    expect(p.muscleAtRisk).toBe(10); // 30 * 0.33 ≈ 10
  });

  it("returns null when already at or below goal", () => {
    expect(buildProjectedPath({ currentWeight: 175, goalWeight: 180, now })).toBeNull();
  });
});
