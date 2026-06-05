import type { WeightUnit } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Weight screen (37). The entry adjusts via a
 * stepper; the coach line recomputes the delta vs. the last weigh-in and judges
 * the pace (muscle-safe loss is ~0.5–2/wk). `buildWeightLogDraft` maps to the
 * shared `WeightLog` contract.
 */

export const STEP: Record<WeightUnit, number> = { lb: 0.2, kg: 0.1 };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function stepWeight(value: number, dir: 1 | -1, unit: WeightUnit): number {
  return round1(value + dir * STEP[unit]);
}

/** Coaching line under the entry, reacting to how today's weight compares. */
export function weightCoachLine(entry: number, last: number | null, unit: WeightUnit): string {
  if (last == null) return "First weigh-in. This sets your baseline.";
  const delta = round1(entry - last);
  const abs = Math.abs(delta);
  if (abs < 0.05) return "Same as your last weigh-in.";
  if (delta < 0) {
    const pace =
      abs <= 2
        ? "That's a steady, muscle-safe pace, so keep doing what you're doing."
        : "That's quick. Keep protein and training up to protect your muscle.";
    return `Down ${abs.toFixed(1)} ${unit} since your last weigh-in. ${pace}`;
  }
  return `Up ${abs.toFixed(1)} ${unit} since your last weigh-in. A blip is normal. Keep your protein steady.`;
}

export interface WeightLogDraft {
  value: number;
  unit: WeightUnit;
  measuredAt: string;
  source: "manual";
}

export function buildWeightLogDraft(value: number, unit: WeightUnit, measuredAt: string): WeightLogDraft {
  return { value: round1(value), unit, measuredAt, source: "manual" };
}
