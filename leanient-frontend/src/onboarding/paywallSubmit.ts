import type { User } from "@leanient/shared";
import type { CompleteOnboardingResult } from "../context/OnboardingContext";
import { extractPlanTargets, type YourPlanTargets } from "./yourPlan";

interface CompletePaywallOnboardingInput {
  submit: () => Promise<CompleteOnboardingResult>;
  updateCachedUser: (user: User) => Promise<User>;
}

export async function completePaywallOnboarding({
  submit,
  updateCachedUser,
}: CompletePaywallOnboardingInput): Promise<YourPlanTargets> {
  const result = await submit();
  await updateCachedUser(result.user);
  return extractPlanTargets(result);
}
