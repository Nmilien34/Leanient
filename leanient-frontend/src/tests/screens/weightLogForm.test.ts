import { describe, expect, it } from "vitest";
import { buildWeightLogDraft, stepWeight, weightCoachLine } from "../../screens/app/weightLogForm";

describe("stepWeight", () => {
  it("steps by 0.2 lb / 0.1 kg and keeps one decimal", () => {
    expect(stepWeight(184, 1, "lb")).toBe(184.2);
    expect(stepWeight(184, -1, "lb")).toBe(183.8);
    expect(stepWeight(83.4, 1, "kg")).toBe(83.5);
  });
});

describe("weightCoachLine", () => {
  it("calls a muscle-safe loss steady", () => {
    expect(weightCoachLine(184.2, 185, "lb")).toBe(
      "Down 0.8 lb since your last weigh-in. That's a steady, muscle-safe pace, so keep doing what you're doing.",
    );
  });

  it("flags a fast drop", () => {
    expect(weightCoachLine(181.5, 185, "lb")).toContain("That's quick");
  });

  it("treats a gain as a normal blip", () => {
    expect(weightCoachLine(186, 185, "lb")).toContain("Up 1.0 lb");
  });

  it("handles no change and no history", () => {
    expect(weightCoachLine(185, 185, "lb")).toBe("Same as your last weigh-in.");
    expect(weightCoachLine(185, null, "lb")).toBe("First weigh-in. This sets your baseline.");
  });
});

describe("buildWeightLogDraft", () => {
  it("maps to a manual WeightLog draft", () => {
    expect(buildWeightLogDraft(184.2, "lb", "2026-06-03T09:14:00.000Z")).toEqual({
      value: 184.2,
      unit: "lb",
      measuredAt: "2026-06-03T09:14:00.000Z",
      source: "manual",
    });
  });
});
