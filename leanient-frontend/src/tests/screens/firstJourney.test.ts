import { describe, expect, it } from "vitest";
import { buildFirstJourney } from "../../screens/app/firstJourney";

const now = new Date(2026, 5, 2); // Tuesday, Jun 2 2026

describe("buildFirstJourney", () => {
  it("reflects the drug and builds the path strip with an ETA from pace", () => {
    const v = buildFirstJourney({
      medicationName: "Mounjaro",
      currentWeight: 228,
      goalWeight: 180,
      goalWeightUnit: "lb",
      goalPace: "steady", // 1.0 lb/week → 48 weeks → Jun 2 + 336 days
      biggestFear: "losing_muscle",
      now,
    });
    expect(v.medLabel).toBe("Mounjaro");
    expect(v.stakeCaption).toContain("Mounjaro");
    expect(v.startLabel).toBe("228 lb");
    expect(v.goalLabel).toBe("180 lb");
    expect(v.toGoLabel).toBe("48 lb to go");
    expect(v.etaLabel).toBe("May 4"); // 48 weeks out
    expect(v.fearLine).toContain("losing muscle");
  });

  it("falls back gracefully with no medication, weight, or fear", () => {
    const v = buildFirstJourney({ now });
    expect(v.medLabel).toBe("your GLP-1");
    expect(v.startLabel).toBeNull();
    expect(v.goalLabel).toBeNull();
    expect(v.etaLabel).toBeNull();
    expect(v.fearLine.length).toBeGreaterThan(0); // default muscle line
  });

  it("hides the path when already at or below goal", () => {
    const v = buildFirstJourney({ currentWeight: 175, goalWeight: 180, now });
    expect(v.startLabel).toBeNull();
    expect(v.toGoLabel).toBeNull();
  });
});
