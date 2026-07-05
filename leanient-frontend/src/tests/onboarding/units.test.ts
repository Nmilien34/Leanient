import { describe, expect, it } from "vitest";
import { convertWeight, goalWeightRange } from "../../onboarding/units";

describe("goalWeightRange", () => {
  it("opens the full range down to the floor for heavier users", () => {
    // Heavier users can aim all the way to the healthy floor, not just half.
    expect(goalWeightRange(300, "lb")).toEqual({ min: 90, max: 300, initial: 264 });
    expect(goalWeightRange(270, "lb")).toEqual({ min: 90, max: 270, initial: 238 });
  });

  it("keeps a healthy floor for lighter users", () => {
    expect(goalWeightRange(160, "lb")).toEqual({ min: 90, max: 160, initial: 141 });
    expect(goalWeightRange(70, "kg")).toEqual({ min: 40, max: 70, initial: 62 });
  });

  it("clamps the floor under current weight when someone is near the floor", () => {
    // Current weight at or below the floor still yields a valid (non-inverted) range.
    expect(goalWeightRange(85, "lb")).toEqual({ min: 85, max: 85, initial: 85 });
    expect(goalWeightRange(38, "kg")).toEqual({ min: 38, max: 38, initial: 38 });
  });

  it("gives a 270 lb user the full 90-270 range", () => {
    expect(goalWeightRange(270, "lb").min).toBe(90);
    expect(goalWeightRange(270, "lb").max).toBe(270);
  });

  it("round-trips lb to kg and back within rounding", () => {
    const kg = convertWeight(270, "lb", "kg");
    expect(convertWeight(kg, "kg", "lb")).toBe(269);
  });
});
