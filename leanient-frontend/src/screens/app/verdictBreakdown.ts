import type { MuscleRetentionSnapshot } from "@leanient/shared";

/**
 * FRONTEND-ONLY view model that turns the latest weekly snapshot's component
 * scores into the quantified verdict breakdown. The engine already computes
 * protein, training, pace, and the composite retention score (0-100 each); they
 * just lived behind the "Why this verdict?" sheet. This surfaces them so a glance
 * tells you the number and which lever is leaking.
 */

export interface VerdictComponent {
  key: "protein" | "training" | "pace";
  label: string;
  score: number;
}

export interface VerdictBreakdown {
  retention: number;
  components: VerdictComponent[];
  /** Change in retention vs the prior week; null with only one week of data. */
  retentionDelta: number | null;
  /** The lowest component, the lever most worth pulling. */
  weakest: VerdictComponent;
  /** A one-line nudge, or null when every lever is already strong. */
  weakestLine: string | null;
}

// A component at or above this reads as "handled"; below it is the lever to pull.
const STRONG_SCORE = 75;

export function buildVerdictBreakdown(
  snapshots: MuscleRetentionSnapshot[],
): VerdictBreakdown | null {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const components: VerdictComponent[] = [
    { key: "protein", label: "Protein", score: Math.round(latest.proteinScore) },
    { key: "training", label: "Training", score: Math.round(latest.trainingScore) },
    { key: "pace", label: "Pace", score: Math.round(latest.paceScore) },
  ];

  const weakest = components.reduce((low, c) => (c.score < low.score ? c : low), components[0]);
  const weakestLine =
    weakest.score < STRONG_SCORE
      ? `${weakest.label} is the lever to pull this week.`
      : null;

  return {
    retention: Math.round(latest.muscleRetentionScore),
    components,
    retentionDelta: prev ? Math.round(latest.muscleRetentionScore - prev.muscleRetentionScore) : null,
    weakest,
    weakestLine,
  };
}
