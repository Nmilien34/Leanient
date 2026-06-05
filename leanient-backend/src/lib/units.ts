export type UnitSystem = "imperial" | "metric";

export function convertWeightForDisplay(
  weightLb: number,
  units: UnitSystem,
): { value: number; unit: "lb" | "kg" } {
  if (units === "imperial") {
    return {
      value: weightLb,
      unit: "lb",
    };
  }

  return {
    value: Number((weightLb / 2.2046).toFixed(1)),
    unit: "kg",
  };
}
