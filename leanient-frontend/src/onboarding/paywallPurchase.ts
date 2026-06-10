import type { User } from "@leanient/shared";
import type { CompleteOnboardingResult } from "../context/OnboardingContext";
import {
  applyRevenueCatCustomerInfoToUser,
  type RevenueCatPlanId,
  type RevenueCatPurchaseResult,
} from "../services/revenueCat.service";
import { completePaywallOnboarding } from "./paywallSubmit";
import type { YourPlanTargets } from "./yourPlan";

interface StartPaywallTrialInput {
  user: User | null;
  planId: RevenueCatPlanId;
  purchasePlan: (input: { planId: RevenueCatPlanId; appUserId: string }) => Promise<RevenueCatPurchaseResult>;
  submit: () => Promise<CompleteOnboardingResult>;
  updateCachedUser: (user: User) => Promise<User>;
}

export type StartPaywallTrialResult =
  | { status: "completed"; plan: YourPlanTargets }
  | { status: "cancelled" };

export async function startPaywallTrial({
  user,
  planId,
  purchasePlan,
  submit,
  updateCachedUser,
}: StartPaywallTrialInput): Promise<StartPaywallTrialResult> {
  if (!user?.id) {
    throw new Error("Sign in again to start your trial.");
  }

  const purchase = await purchasePlan({ planId, appUserId: user.id });
  if (purchase.status === "cancelled") {
    return { status: "cancelled" };
  }

  const plan = await completePaywallOnboarding({
    submit,
    updateCachedUser,
    mapUser: (completedUser) =>
      applyRevenueCatCustomerInfoToUser(completedUser, purchase.customerInfo),
  });

  return { status: "completed", plan };
}
