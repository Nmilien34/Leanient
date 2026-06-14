export const MUSCLE_RETENTION_ENGINE_VERSION = "v1.0";

export type MuscleRetentionLabel =
  | "keeping_muscle"
  | "maintaining"
  | "losing_some"
  | "losing_muscle";

export interface MuscleRetentionScoreInput {
  proteinAdherence: number;
  trainingAdherence: number;
  weeklyWeightLossLb: number;
}

export interface MuscleRetentionScoreResult {
  proteinScore: number;
  trainingScore: number;
  paceScore: number;
  muscleRetentionScore: number;
  retentionLabel: MuscleRetentionLabel;
}

// PRODUCT_TUNING: protein is the highest-weight proxy because adequate intake is
// the most direct behavior lever for lean-mass preservation on GLP-1 medications.
const PROTEIN_WEIGHT = 0.5;
// PRODUCT_TUNING: resistance training is the second largest proxy because it
// provides the weekly muscle-preservation signal the app coaches toward.
const TRAINING_WEIGHT = 0.35;
// PRODUCT_TUNING: pace matters, but it is intentionally lower-weight because
// strong protein and training can offset moderate loss pace.
const PACE_WEIGHT = 0.15;

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function scorePace(weeklyWeightLossLb: number): number {
  // PRODUCT_TUNING: gained weight is not a muscle-retention disaster, but it is
  // not the target outcome, so it scores below conservative loss.
  if (weeklyWeightLossLb < 0) {
    return 60;
  }

  // PRODUCT_TUNING: these pace bands are starting heuristics and should be
  // revisited once real user data shows how the chart behaves over time.
  if (weeklyWeightLossLb <= 0.5) {
    return 100;
  }

  if (weeklyWeightLossLb <= 1) {
    return 90;
  }

  if (weeklyWeightLossLb <= 1.5) {
    return 75;
  }

  if (weeklyWeightLossLb <= 2) {
    return 55;
  }

  return 30;
}

function labelForScore(score: number): MuscleRetentionLabel {
  // PRODUCT_TUNING: labels are frontend-visible product language and should be
  // adjusted carefully because they shape user confidence in the trend line.
  if (score >= 75) {
    return "keeping_muscle";
  }

  if (score >= 60) {
    return "maintaining";
  }

  if (score >= 40) {
    return "losing_some";
  }

  return "losing_muscle";
}

// PRODUCT_TUNING: published cohorts put lean mass at ~25-39% of total weight
// lost on GLP-1 medications without protein + resistance intervention. These
// bounds frame the muscle-retention score's two ends: a perfect score lands at
// the achievable floor (high protein + training), a zero score at the upper end
// of the unmanaged range. Conservative on purpose: we never claim zero muscle
// loss, and never claim better than the research floor.
const LEAN_FRACTION_FLOOR = 0.12;
const LEAN_FRACTION_CEILING = 0.4;

export interface WeightLossComposition {
  totalLostLb: number;
  estimatedFatLostLb: number;
  estimatedMuscleLostLb: number;
  /** Fat as a share of total loss, 0-100. The headline "X% of your loss was fat". */
  fatShareOfLossPct: number;
  /** Lean-mass share of loss, 0-1, before rounding into pounds. */
  leanFractionOfLoss: number;
}

/**
 * Map a muscle-retention score (0-100) to the estimated lean-mass share of weight
 * lost. Score 100 -> floor (best protection), score 0 -> ceiling (worst). Linear
 * and explainable by design; this is a heuristic, not a DEXA scan.
 */
export function estimateLeanFractionOfLoss(retentionScore: number): number {
  const score = clampScore(retentionScore);
  const fraction = LEAN_FRACTION_CEILING - (score / 100) * (LEAN_FRACTION_CEILING - LEAN_FRACTION_FLOOR);
  return Number(fraction.toFixed(4));
}

/**
 * Split a cumulative weight loss into estimated fat and muscle pounds. The lean
 * fraction is a loss-weighted average across the weeks that actually lost weight
 * (so a fast, low-protein week contributes more muscle), then applied to the real
 * cumulative loss so fat + muscle always reconciles to the total. Weeks of
 * maintenance or gain contribute no muscle loss. Falls back to the latest score
 * when there are no positive-loss weeks to weight.
 */
export function composeWeightLoss(args: {
  totalLostLb: number;
  weeklyLosses: { weeklyWeightLossLb: number; muscleRetentionScore: number }[];
  fallbackScore: number;
}): WeightLossComposition {
  const totalLostLb = Number(Math.max(0, args.totalLostLb).toFixed(1));

  let lossSum = 0;
  let weightedLeanSum = 0;
  for (const week of args.weeklyLosses) {
    if (week.weeklyWeightLossLb > 0) {
      lossSum += week.weeklyWeightLossLb;
      weightedLeanSum += week.weeklyWeightLossLb * estimateLeanFractionOfLoss(week.muscleRetentionScore);
    }
  }

  const leanFraction = lossSum > 0 ? weightedLeanSum / lossSum : estimateLeanFractionOfLoss(args.fallbackScore);
  const estimatedMuscleLostLb = Number((totalLostLb * leanFraction).toFixed(1));
  const estimatedFatLostLb = Number((totalLostLb - estimatedMuscleLostLb).toFixed(1));
  const fatShareOfLossPct = totalLostLb > 0 ? Math.round((estimatedFatLostLb / totalLostLb) * 100) : 0;

  return {
    totalLostLb,
    estimatedFatLostLb,
    estimatedMuscleLostLb,
    fatShareOfLossPct,
    leanFractionOfLoss: Number(leanFraction.toFixed(4)),
  };
}

export function computeMuscleRetentionScore(
  input: MuscleRetentionScoreInput,
): MuscleRetentionScoreResult {
  const proteinScore = clampScore(input.proteinAdherence * 100);
  const trainingScore = clampScore(input.trainingAdherence * 100);
  const paceScore = scorePace(input.weeklyWeightLossLb);
  const muscleRetentionScore = Number(
    (
      proteinScore * PROTEIN_WEIGHT +
      trainingScore * TRAINING_WEIGHT +
      paceScore * PACE_WEIGHT
    ).toFixed(1),
  );

  return {
    proteinScore,
    trainingScore,
    paceScore,
    muscleRetentionScore,
    retentionLabel: labelForScore(muscleRetentionScore),
  };
}
