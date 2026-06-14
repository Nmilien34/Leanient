import type { MuscleRetentionSnapshot } from "@leanient/shared";

/**
 * FRONTEND-ONLY "face & skin protection" signal. Facial fullness on a GLP-1 is
 * downstream of two things we already score every week: protein adequacy (skin
 * and collagen need it) and loss pace (fast loss deflates the face first). This
 * blends those into an honest estimate of how well a user's habits are
 * protecting their face — no photos, no on-device measurement required, so it
 * works for everyone, today.
 *
 * It is an estimate from behavior, not a measurement of the actual face.
 */

// PRODUCT_TUNING: protein is the larger lever for facial volume (collagen), with
// loss pace as the secondary deflation risk.
const PROTEIN_WEIGHT = 0.6;
const PACE_WEIGHT = 0.4;

// How many recent weeks of behavior feed the signal.
const RECENT_WEEKS = 4;

// A factor at or above this is "handled"; below it is the lever to pull.
const STRONG_FACTOR = 75;

export interface FaceProtectionSignal {
  score: number;
  label: "strong" | "fair" | "at_risk";
  proteinScore: number;
  paceScore: number;
  weakFactor: "protein" | "pace" | null;
  headline: string;
  line: string;
}

const avg = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;

export function buildFaceProtectionSignal(
  snapshots: Pick<MuscleRetentionSnapshot, "proteinScore" | "paceScore" | "weekOf">[],
): FaceProtectionSignal | null {
  if (snapshots.length === 0) return null;

  const recent = [...snapshots]
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf))
    .slice(-RECENT_WEEKS);

  const proteinScore = Math.round(avg(recent.map((s) => s.proteinScore)));
  const paceScore = Math.round(avg(recent.map((s) => s.paceScore)));
  const score = Math.round(proteinScore * PROTEIN_WEIGHT + paceScore * PACE_WEIGHT);

  const label: FaceProtectionSignal["label"] = score >= 75 ? "strong" : score >= 55 ? "fair" : "at_risk";

  // The lower of the two weak factors gets the nudge; protein wins ties (bigger lever).
  let weakFactor: FaceProtectionSignal["weakFactor"] = null;
  if (proteinScore < STRONG_FACTOR && proteinScore <= paceScore) weakFactor = "protein";
  else if (paceScore < STRONG_FACTOR) weakFactor = "pace";

  const proteinNudge =
    "Protein is the lever here: it feeds the collagen that keeps your face full. Getting back to your target protects it.";
  const paceNudge =
    "You're losing quickly, which deflates the face first. A gentler pace gives your skin time to keep up.";

  let headline: string;
  let line: string;
  if (label === "strong") {
    headline = "Your face is well protected";
    line = "Strong protein and a steady loss pace are exactly what keep facial volume. You're hitting both.";
  } else if (label === "fair") {
    headline = "Your face protection is holding";
    line = weakFactor === "protein" ? proteinNudge : weakFactor === "pace" ? paceNudge : "Keep protein up and your pace steady to hold facial volume.";
  } else {
    headline = "Your face is at risk of thinning";
    line = weakFactor === "pace" ? paceNudge : proteinNudge;
  }

  return { score, label, proteinScore, paceScore, weakFactor, headline, line };
}
