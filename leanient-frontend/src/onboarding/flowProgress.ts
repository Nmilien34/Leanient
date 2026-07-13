/**
 * The conversation's running order. The hairline progress bar reads position
 * straight from this list, so it advances evenly with every screen instead of
 * the old hand-tuned fractions. Skipped steps (not-on-GLP users jump the
 * medication cluster) simply move the bar further in one hop.
 */
export const ONBOARDING_FLOW_ORDER = [
  "welcome",
  "journey",
  "glp",
  "medicationDetails",
  "shotDay",
  "energyReality",
  "fear",
  "truth",
  "basics",
  "heightWeight",
  "goalWeight",
  "pace",
  "trainingStatus",
  "crafting",
  "planReady",
  "paywall",
] as const;

export type OnboardingStep = (typeof ONBOARDING_FLOW_ORDER)[number];

export function onboardingProgress(step: OnboardingStep): number {
  const index = ONBOARDING_FLOW_ORDER.indexOf(step);
  return (index + 1) / ONBOARDING_FLOW_ORDER.length;
}
