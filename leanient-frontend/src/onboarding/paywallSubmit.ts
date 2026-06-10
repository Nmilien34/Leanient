import type { User } from "@leanient/shared";
import type { CompleteOnboardingResult } from "../context/OnboardingContext";
import { extractPlanTargets, type YourPlanTargets } from "./yourPlan";

interface CompletePaywallOnboardingInput {
  submit: () => Promise<CompleteOnboardingResult>;
  updateCachedUser: (user: User) => Promise<User>;
  mapUser?: (user: User) => User;
}

export async function completePaywallOnboarding({
  submit,
  updateCachedUser,
  mapUser,
}: CompletePaywallOnboardingInput): Promise<YourPlanTargets> {
  const result = await submit();
  await updateCachedUser(mapUser ? mapUser(result.user) : result.user);
  return extractPlanTargets(result);
}
