import { describe, expect, it } from "vitest";
import { convertWeight, goalWeightRange } from "../../onboarding/units";

describe("goalWeightRange", () => {
  it("lets heavier users target down to half their current weight", () => {
    expect(goalWeightRange(300, "lb")).toEqual({ min: 150, max: 300, initial: 264 });
    expect(goalWeightRange(270, "lb")).toEqual({ min: 135, max: 270, initial: 238 });
  });

  it("keeps a healthy floor for lighter users", () => {
    // Half of current would dip below the floor; the floor wins.
    expect(goalWeightRange(160, "lb")).toEqual({ min: 90, max: 160, initial: 141 });
    expect(goalWeightRange(70, "kg")).toEqual({ min: 40, max: 70, initial: 62 });
  });

  it("regression: a 270 lb weight mislabeled as 122 lb produced a 90-122 slider", () => {
    // 270 lb converts to 122 kg. When that kg number reached the goal screen
    // stamped as lb, the slider capped at 122 lb. The range math is unit-blind
    // by design; HeightWeightScreen owns keeping value and unit paired.
    expect(convertWeight(270, "lb", "kg")).toBe(122);
    expect(goalWeightRange(122, "lb").min).toBe(90);
    expect(goalWeightRange(122, "lb").max).toBe(122);
    // The same person measured correctly gets a usable range.
    expect(goalWeightRange(270, "lb").min).toBe(135);
  });

  it("round-trips lb to kg and back within rounding", () => {
    const kg = convertWeight(270, "lb", "kg");
    expect(convertWeight(kg, "kg", "lb")).toBe(269);
  });
});
