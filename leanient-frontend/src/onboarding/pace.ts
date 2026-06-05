import type { WeightUnit } from "@leanient/shared";

/**
 * Pace screen logic. The weekly-rate number and projected date are DISPLAY-ONLY
 * UI sugar — the contract only stores `goalPace` (the enum bucket), which we
 * derive from the slider position. Nothing here crosses the API boundary except
 * the bucket index → `PACE_OPTIONS[index].value`.
 */
export interface PaceRange {
  min: number;
  max: number;
  step: number;
  decimals: number;
}

export function paceRange(unit: WeightUnit): PaceRange {
  return unit === "lb"
    ? { min: 0.5, max: 2.5, step: 0.1, decimals: 1 }
    : { min: 0.25, max: 1.2, step: 0.05, decimals: 2 };
}

export function defaultPace(unit: WeightUnit): number {
  return unit === "lb" ? 1.0 : 0.5;
}

// Representative slider fraction for each persona (Steady / Balanced / Fast).
const BUCKET_FRACTION = [0.25, 0.5, 0.85];

/** Which persona bucket (0..2) a weekly rate falls into. */
export function paceBucketIndex(value: number, r: PaceRange): number {
  const f = (value - r.min) / (r.max - r.min);
  if (f < 0.34) return 0;
  if (f < 0.67) return 1;
  return 2;
}

/** The representative weekly rate when a persona is tapped. */
export function paceForBucket(index: number, r: PaceRange): number {
  const raw = r.min + BUCKET_FRACTION[index] * (r.max - r.min);
  return Math.round(raw / r.step) * r.step;
}

export function formatPace(value: number, r: PaceRange): string {
  return value.toFixed(r.decimals);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Project the date the user reaches their goal at the chosen weekly rate. */
export function projectTargetDate(toLose: number, pacePerWeek: number, from: Date): Date {
  const weeks = pacePerWeek > 0 ? toLose / pacePerWeek : 0;
  const d = new Date(from);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d;
}

/** Format as "Oct 14, 2026" without relying on Intl (Hermes-safe). */
export function formatLongDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
