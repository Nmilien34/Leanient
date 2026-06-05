import type { CompleteOnboardingResult } from "../context/OnboardingContext";

/**
 * The personalized plan shown on the post-submit celebration view. These are the
 * REAL backend-computed targets (Mifflin-St Jeor) returned by POST
 * /onboarding/complete, not the pre-submit estimates from the paywall card.
 */
export interface YourPlanTargets {
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  weeklyWorkoutTarget: number;
}

/**
 * Pull the three computed targets out of the onboarding response. Typed against
 * the real `CompleteOnboardingResult` so a contract change to the response breaks
 * compilation here rather than silently dropping a value.
 */
export function extractPlanTargets(result: CompleteOnboardingResult): YourPlanTargets {
  const { dailyProteinTarget, dailyCalorieTarget, weeklyWorkoutTarget } = result.profile;
  return { dailyProteinTarget, dailyCalorieTarget, weeklyWorkoutTarget };
}

/** Group an integer with thousands commas, e.g. 1850 -> "1,850". */
export function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatProtein(grams: number): string {
  return `${Math.round(grams)} g`;
}

export function formatCalories(kcal: number): string {
  return `${formatThousands(kcal)} kcal`;
}

export function formatTraining(sessions: number): string {
  return `${sessions} session${sessions === 1 ? "" : "s"}`;
}
