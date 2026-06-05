import type { GoalPace, Sex, TrainingStatus, WeightUnit } from "@leanient/shared";

/**
 * Daily protein + calorie targets, computed server-side with the Mifflin-St Jeor
 * basal metabolic rate (BMR) model. This module is the single source of truth for
 * nutrition targets: onboarding and profile edits both flow through it, so the
 * frontend never computes targets locally.
 *
 * The model is a calm, conservative heuristic, not a metabolic ward measurement.
 * Numbers marked `PRODUCT_TUNING:` are intentional product choices and safe to
 * adjust as we learn; the formula structure (Mifflin-St Jeor) should stay.
 */

const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;
// 1 lb of body fat stores roughly 3500 kcal; used to turn a weekly loss pace
// into a daily calorie deficit.
const KCAL_PER_LB_FAT = 3500;

// PRODUCT_TUNING: activity multiplier applied to BMR to estimate maintenance
// energy (TDEE). Kept deliberately on the low side because GLP-1 users often move
// less while titrating, and under-shooting maintenance is safer than over-shooting
// it during a deliberate deficit. Raise per-status as real adherence data arrives.
const ACTIVITY_FACTOR: Record<TrainingStatus, number> = {
  not_training: 1.2,
  beginner: 1.375,
  returning: 1.45,
  consistent: 1.55,
};

// PRODUCT_TUNING: weekly weight-loss pace in lb/week. Keep these aligned with the
// onboarding pace copy (gentle / steady / aggressive).
const PACE_LB_PER_WEEK: Record<GoalPace, number> = {
  gentle: 0.5,
  steady: 1.0,
  aggressive: 1.5,
};

// PRODUCT_TUNING: protein grams per kg of CURRENT body weight. Anchored high to
// protect lean mass through a GLP-1 deficit, which is the core Leanient promise.
// Recomputes downward naturally as logged weight falls. The floor keeps very light
// users at a sensible minimum.
const PROTEIN_G_PER_KG = 1.6;
const PROTEIN_FLOOR_G = 80;

// PRODUCT_TUNING: hard calorie floors by sex. Never prescribe below these even at
// an aggressive pace. Onboarding collects male/female only, so these two cover all
// inputs; the female floor is the conservative default used elsewhere.
const CALORIE_FLOOR: Record<Sex, number> = {
  male: 1500,
  female: 1200,
};

export interface NutritionTargetsInput {
  currentWeightLb: number;
  /** Reserved for future tuning. Mifflin-St Jeor BMR does not use goal weight. */
  goalWeightLb: number;
  goalPace: GoalPace;
  sex: Sex;
  ageYears: number;
  heightInches: number;
  trainingStatus: TrainingStatus;
}

export interface NutritionTargets {
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
}

/** Normalize a weight measurement to pounds. */
export function lbFromWeight(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value * LB_PER_KG : value;
}

/**
 * Compute daily protein and calorie targets via Mifflin-St Jeor.
 *
 *   BMR  = 10*kg + 6.25*cm - 5*age + (sex === "male" ? 5 : -161)
 *   TDEE = BMR * activityFactor(trainingStatus)
 *   kcal = TDEE - dailyDeficit(goalPace), floored by sex
 *   protein = currentWeightKg * 1.6 g/kg, floored
 */
export function computeNutritionTargets(input: NutritionTargetsInput): NutritionTargets {
  const weightKg = input.currentWeightLb / LB_PER_KG;
  const heightCm = input.heightInches * CM_PER_INCH;

  const sexOffset = input.sex === "male" ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * input.ageYears + sexOffset;

  const tdee = bmr * ACTIVITY_FACTOR[input.trainingStatus];
  const dailyDeficit = (PACE_LB_PER_WEEK[input.goalPace] * KCAL_PER_LB_FAT) / 7;

  const dailyCalorieTarget = Math.max(
    CALORIE_FLOOR[input.sex],
    Math.round((tdee - dailyDeficit) / 10) * 10,
  );

  const dailyProteinTarget = Math.max(
    PROTEIN_FLOOR_G,
    Math.round(weightKg * PROTEIN_G_PER_KG),
  );

  return { dailyProteinTarget, dailyCalorieTarget };
}

export interface ProfileNutritionInputs {
  sex?: Sex;
  ageYears?: number;
  heightInches?: number;
  goalPace: GoalPace;
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  trainingStatus: TrainingStatus;
}

/**
 * Compute targets for a stored profile + its current logged weight. Returns null
 * when a Mifflin input is missing (a legacy profile created before sex/age/height
 * were collected), so callers can keep existing targets and flag the profile for a
 * one-time input update rather than fabricating values.
 */
export function computeTargetsForProfile(
  profile: ProfileNutritionInputs,
  currentWeightLb: number,
): NutritionTargets | null {
  if (profile.sex == null || profile.ageYears == null || profile.heightInches == null) {
    return null;
  }

  return computeNutritionTargets({
    currentWeightLb,
    goalWeightLb: lbFromWeight(profile.goalWeight, profile.goalWeightUnit),
    goalPace: profile.goalPace,
    sex: profile.sex,
    ageYears: profile.ageYears,
    heightInches: profile.heightInches,
    trainingStatus: profile.trainingStatus,
  });
}
