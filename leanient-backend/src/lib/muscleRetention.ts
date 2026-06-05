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
