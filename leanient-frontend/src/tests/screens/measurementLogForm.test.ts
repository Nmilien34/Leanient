import { describe, expect, it } from "vitest";
import { buildMeasurementLogDraft, initialMeasureState, stepMeasure } from "../../screens/app/measurementLogForm";

describe("stepMeasure", () => {
  it("steps by 0.1 in / 0.5 cm and clamps at zero", () => {
    expect(stepMeasure(34, 1, "in")).toBe(34.1);
    expect(stepMeasure(34, -1, "in")).toBe(33.9);
    expect(stepMeasure(40, 1, "cm")).toBe(40.5);
    expect(stepMeasure(0, -1, "in")).toBe(0);
  });
});

describe("buildMeasurementLogDraft", () => {
  it("maps filled fields to a MeasurementLog draft and omits blanks", () => {
    const draft = buildMeasurementLogDraft(initialMeasureState, "in", "2026-06-03T12:00:00.000Z");
    expect(draft.unit).toBe("in");
    expect(draft.measurements).toEqual({ waist: 34, hip: 40.5, chest: 41, arm: 13.2, thigh: 22 });
    expect("neck" in draft.measurements).toBe(false); // blank → omitted
  });

  it("includes a field once it's been set", () => {
    const draft = buildMeasurementLogDraft({ ...initialMeasureState, neck: 14.5 }, "in", "2026-06-03T12:00:00.000Z");
    expect(draft.measurements.neck).toBe(14.5);
  });
});
