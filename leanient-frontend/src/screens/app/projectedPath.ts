import type { GoalPace } from "@leanient/shared";
import { classifyDrug, leanFractionFor } from "./firstJourney";

/**
 * FRONTEND-ONLY cold-start projection. A new user's Progress charts are empty,
 * so instead of a blank "no data" state we draw the path ahead: their weight
 * trajectory from today to goal at their chosen pace, plus an honest note on how
 * much of that loss could be muscle without a plan (drug-aware, see
 * docs/glp1-clinical-reference.md). It's a projection, framed as one — never a
 * promise, never a scare line.
 */

export interface ProjectedPath {
  /** Sampled projected weights, today → goal, for the line chart. */
  points: number[];
  unit: string;
  startLabel: string; // "228 lb"
  goalLabel: string; // "180 lb"
  etaLabel: string; // "May 4"
  toLose: number; // 48
  muscleAtRisk: number; // ~ lb of the loss that could be muscle
  annotation: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PACE_LB_PER_WEEK: Record<GoalPace, number> = { gentle: 0.5, steady: 1.0, aggressive: 1.5 };
const MAX_POINTS = 9;

export function buildProjectedPath(args: {
  currentWeight: number;
  goalWeight: number;
  goalWeightUnit?: string | null;
  goalPace?: GoalPace | null;
  medicationName?: string | null;
  now: Date;
}): ProjectedPath | null {
  const { currentWeight, goalWeight, goalWeightUnit, goalPace, medicationName, now } = args;
  const unit = goalWeightUnit ?? "lb";
  const toLose = Math.round(currentWeight - goalWeight);
  if (toLose <= 0) return null; // nothing to project (already at/under goal)

  const lbPerWeek = PACE_LB_PER_WEEK[goalPace ?? "steady"];
  const weeks = Math.max(1, Math.ceil(toLose / lbPerWeek));
  const steps = Math.min(MAX_POINTS, weeks + 1);
  const points = Array.from({ length: steps }, (_, i) => {
    const t = steps > 1 ? i / (steps - 1) : 1;
    return Math.round((currentWeight - (currentWeight - goalWeight) * t) * 10) / 10;
  });

  const eta = new Date(now.getTime() + weeks * 7 * 86_400_000);
  const etaLabel = `${MONTHS[eta.getMonth()]} ${eta.getDate()}`;
  const muscleAtRisk = Math.max(1, Math.round(toLose * leanFractionFor(classifyDrug(medicationName))));

  return {
    points,
    unit,
    startLabel: `${Math.round(currentWeight)} ${unit}`,
    goalLabel: `${Math.round(goalWeight)} ${unit}`,
    etaLabel,
    toLose,
    muscleAtRisk,
    annotation: `Of the ~${toLose} ${unit} ahead, ~${muscleAtRisk} ${unit} could be muscle without a plan. That's the part we protect.`,
  };
}
