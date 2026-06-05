import { describe, expect, it } from "vitest";
import { convertWeightForDisplay } from "../../lib/units";

describe("convertWeightForDisplay", () => {
  it("keeps imperial weights in pounds", () => {
    expect(convertWeightForDisplay(1.2, "imperial")).toEqual({
      value: 1.2,
      unit: "lb",
    });
  });

  it("converts pounds to kilograms for metric display", () => {
    expect(convertWeightForDisplay(1.2, "metric")).toEqual({
      value: 0.5,
      unit: "kg",
    });
  });

  it("converts zero pounds cleanly for metric display", () => {
    expect(convertWeightForDisplay(0, "metric")).toEqual({
      value: 0,
      unit: "kg",
    });
  });

  it("converts negative pounds for gained-weight deltas", () => {
    expect(convertWeightForDisplay(-1.2, "metric")).toEqual({
      value: -0.5,
      unit: "kg",
    });
  });

  it("handles very small pound values without NaN or noisy floating point output", () => {
    expect(convertWeightForDisplay(0.1, "metric")).toEqual({
      value: 0,
      unit: "kg",
    });
  });
});
