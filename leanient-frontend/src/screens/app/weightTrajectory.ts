/**
 * Home "weight trajectory" card. On-protocol users see the next-shot tile in the
 * rings, so their weight trend never shows on Today. This surfaces it, and
 * frames the number the way a coach would: not just "down 1.2 lb" but whether
 * that pace is in the muscle-safe band. Losing faster than ~2 lb/wk is where
 * lean mass starts going with the fat (see docs/glp1-clinical-reference.md).
 */

export type WeightPace = "gentle" | "steady" | "fast" | "holding" | "unknown";

export interface WeightTrajectoryView {
  current: number;
  unit: string;
  /** Recent weigh-ins, oldest to newest; drives the sparkline. */
  series: number[];
  /** This week's change in display unit; null when nothing was weighed this week. */
  weekDelta: number | null;
  weekDeltaLabel: string;
  /** Change across the visible window (current minus oldest in series). */
  windowDelta: number;
  pace: WeightPace;
  paceLabel: string;
}

/** Muscle-safe weekly loss band, in lb. Below is gentle, above risks lean mass. */
export const SAFE_MIN_LB = 0.5;
export const SAFE_MAX_LB = 2.0;

const toLb = (value: number, unit: string): number => (unit === "kg" ? value * 2.2046226 : value);

function classifyPace(weekDelta: number | null, unit: string): { pace: WeightPace; paceLabel: string } {
  if (weekDelta == null) return { pace: "unknown", paceLabel: "Weigh in to see your pace" };
  const deltaLb = toLb(weekDelta, unit);
  const lossLb = -deltaLb; // positive when losing
  if (lossLb > SAFE_MAX_LB) return { pace: "fast", paceLabel: "Quick pace, lean on protein and strength" };
  if (lossLb >= SAFE_MIN_LB) return { pace: "steady", paceLabel: "Right in the safe zone" };
  if (lossLb > 0) return { pace: "gentle", paceLabel: "Gentle pace" };
  return { pace: "holding", paceLabel: "Holding steady" };
}

export function buildWeightTrajectory(args: {
  current: number;
  unit: string;
  series: number[];
  weekDelta: number | null;
}): WeightTrajectoryView | null {
  const { current, unit, series, weekDelta } = args;
  if (series.length === 0) return null;

  const weekDeltaLabel =
    weekDelta == null
      ? "No weigh-in this week"
      : `${weekDelta <= 0 ? "↓" : "↑"} ${Math.abs(weekDelta).toFixed(1)} ${unit} this week`;
  const windowDelta = series.length >= 2 ? current - series[0] : 0;
  const { pace, paceLabel } = classifyPace(weekDelta, unit);

  return { current, unit, series, weekDelta, weekDeltaLabel, windowDelta, pace, paceLabel };
}
