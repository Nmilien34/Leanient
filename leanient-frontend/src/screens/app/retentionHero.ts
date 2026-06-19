import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { buildVerdictBreakdown, type VerdictBreakdown } from "./verdictBreakdown";

/**
 * FRONTEND-ONLY view model for the glanceable Home hero: the muscle-retention
 * score as a gauge, its band (color), the recent trend (sparkline), and the
 * week-over-week delta. Reuses buildVerdictBreakdown for the number + levers and
 * adds the band + trend so "how am I doing?" reads in one glance.
 */

export type RetentionBand = "on_track" | "drifting" | "losing";

const BAND_LABEL: Record<RetentionBand, string> = {
  on_track: "On track",
  drifting: "Drifting",
  losing: "Losing muscle",
};

export interface RetentionHeroView extends VerdictBreakdown {
  band: RetentionBand;
  statusLabel: string;
  /** Recent weekly retention scores for the trend line (oldest → newest). */
  trend: number[];
}

/** Score → band, matching the verdict engine's thresholds. */
export function bandForScore(score: number): RetentionBand {
  if (score >= 80) return "on_track";
  if (score >= 55) return "drifting";
  return "losing";
}

export function buildRetentionHero(snapshots: MuscleRetentionSnapshot[]): RetentionHeroView | null {
  const breakdown = buildVerdictBreakdown(snapshots);
  if (!breakdown) return null;

  const sorted = [...snapshots].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  const trend = sorted.slice(-8).map((s) => Math.round(s.muscleRetentionScore));
  const band = bandForScore(breakdown.retention);

  return { ...breakdown, band, statusLabel: BAND_LABEL[band], trend };
}
