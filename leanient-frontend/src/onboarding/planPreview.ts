import type { OnboardingDraft } from "./draft";
import { PACE_OPTIONS } from "./options";
import { paceForBucket, paceRange, projectTargetDate, formatLongDate } from "./pace";
import { DEFAULT_WEIGHT_LB } from "./units";

/**
 * The four values shown on the Paywall "plan reveal" card. All are derived from
 * the onboarding draft and are display/coaching estimates only. The real protein
 * and calorie targets are computed by the backend (Mifflin-St Jeor) after submit;
 * the protein figure here is a pre-submit estimate, not the persisted value.
 */
export interface PlanPreview {
  dailyProteinLabel: string;
  workoutsLabel: string;
  goalDateLabel: string;
  muscleRetainedLabel: string;
}

export function buildPlanPreview(draft: OnboardingDraft, now: Date): PlanPreview {
  const unit = draft.initialWeight?.unit ?? draft.profile.goalWeightUnit ?? "lb";
  const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
  const goalWeight = draft.profile.goalWeight ?? currentWeight;
  const goalPace = draft.profile.goalPace ?? "steady";
  const bucket = Math.max(
    0,
    PACE_OPTIONS.findIndex((p) => p.value === goalPace),
  );

  // Goal date — same projection as the Pace / Crafting screens.
  const rate = paceForBucket(bucket, paceRange(unit));
  const toLose = Math.max(0, currentWeight - goalWeight);
  const goalDateLabel = formatLongDate(projectTargetDate(toLose, rate, now));

  // Workouts/week — coaching guidance (not a contract field). Pace-based for now;
  // can key off trainingStatus once the Training screen is built.
  const workouts = [3, 3, 4][bucket] ?? 3;
  const workoutsLabel = `${workouts} session${workouts === 1 ? "" : "s"}`;

  // Projected muscle retained vs typical GLP-1 loss — a slower pace retains more.
  // Display projection for the reveal, not persisted.
  const muscle = [78, 71, 62][bucket] ?? 71;
  const muscleRetainedLabel = `+${muscle}%`;

  // DISPLAY ESTIMATE ONLY: the persisted dailyProteinTarget is computed by the
  // backend after submit. This is a quick pre-submit preview (~0.9 g per lb of
  // goal weight) so the paywall has a number to show before the API responds.
  const proteinG = unit === "lb" ? Math.round(goalWeight * 0.92) : Math.round(goalWeight * 2.0);
  const dailyProteinLabel = `${proteinG} g`;

  return { dailyProteinLabel, workoutsLabel, goalDateLabel, muscleRetainedLabel };
}
