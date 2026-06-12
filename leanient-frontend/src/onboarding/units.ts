import type { WeightUnit } from "@leanient/shared";
import type { WheelItem } from "../components/ui/Wheel";

/**
 * Height/weight unit logic for the "Your starting point" screen.
 *
 * Weight uses the shared `WeightUnit` (`lb|kg`) — it maps to `initialWeight`.
 * Height uses `"in" | "cm"` (the shared `MEASUREMENT_UNITS` values) but has NO
 * backend field yet, so it is FRONTEND-ONLY and stored in the draft's `basics`
 * slice. See ONBOARDING_CONTRACT_TODOS.md.
 */
export type HeightUnit = "in" | "cm";
export type UnitSystem = "imperial" | "metric";

const range = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i);

// Ranges (inclusive). Imperial height is stored as total inches.
const HEIGHT_IN = { min: 54, max: 84 }; // 4'6" – 7'0"
const HEIGHT_CM = { min: 137, max: 214 };
const WEIGHT_LB = { min: 70, max: 400 };
const WEIGHT_KG = { min: 32, max: 180 };

export const DEFAULT_HEIGHT_IN = 69; // 5'9"
export const DEFAULT_WEIGHT_LB = 198;

export function formatImperialHeight(totalInches: number): string {
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}' ${inch}"`;
}

export function heightUnitFor(system: UnitSystem): HeightUnit {
  return system === "imperial" ? "in" : "cm";
}

export function weightUnitFor(system: UnitSystem): WeightUnit {
  return system === "imperial" ? "lb" : "kg";
}

export function buildHeightItems(unit: HeightUnit): WheelItem[] {
  if (unit === "in") {
    return range(HEIGHT_IN.min, HEIGHT_IN.max).map((v) => ({ value: v, label: formatImperialHeight(v) }));
  }
  return range(HEIGHT_CM.min, HEIGHT_CM.max).map((v) => ({ value: v, label: `${v} cm` }));
}

export function buildWeightItems(unit: WeightUnit): WheelItem[] {
  if (unit === "lb") {
    return range(WEIGHT_LB.min, WEIGHT_LB.max).map((v) => ({ value: v, label: `${v} lb` }));
  }
  return range(WEIGHT_KG.min, WEIGHT_KG.max).map((v) => ({ value: v, label: `${v} kg` }));
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Convert a height value between units and clamp into the new range. */
export function convertHeight(value: number, from: HeightUnit, to: HeightUnit): number {
  if (from === to) return value;
  if (from === "in") return clamp(Math.round(value * 2.54), HEIGHT_CM.min, HEIGHT_CM.max);
  return clamp(Math.round(value / 2.54), HEIGHT_IN.min, HEIGHT_IN.max);
}

/** Convert a weight value between units and clamp into the new range. */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === "lb") return clamp(Math.round(value * 0.45359237), WEIGHT_KG.min, WEIGHT_KG.max);
  return clamp(Math.round(value / 0.45359237), WEIGHT_LB.min, WEIGHT_LB.max);
}

/**
 * Goal-weight slider bounds derived from the user's current weight (a weight-loss
 * goal sits at or below today's weight). `min` allows a goal down to half of the
 * current weight, rounded to 5 with a healthy floor, so heavier users can set
 * ambitious targets (300 lb → 150–300); `max` is the current weight; `initial`
 * defaults to ~12% below current.
 */
export function goalWeightRange(
  current: number,
  unit: WeightUnit,
): { min: number; max: number; initial: number } {
  const floor = unit === "lb" ? 90 : 40;
  const min = Math.max(floor, Math.round((current * 0.5) / 5) * 5);
  const max = current;
  const initial = clamp(current - Math.round(current * 0.12), min, max);
  return { min, max, initial };
}
