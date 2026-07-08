import type { User } from "@leanient/shared";
import type { CompleteOnboardingResult } from "../context/OnboardingContext";
import {
  applyRevenueCatCustomerInfoToUser,
  type RevenueCatPlanId,
  type RevenueCatPurchaseResult,
} from "../services/revenueCat.service";
import { completePaywallOnboarding } from "./paywallSubmit";
import type { YourPlanTargets } from "./yourPlan";

interface StartPaywallSubscriptionInput {
  user: User | null;
  planId: RevenueCatPlanId;
  purchasePlan: (input: { planId: RevenueCatPlanId; appUserId: string }) => Promise<RevenueCatPurchaseResult>;
  submit: () => Promise<CompleteOnboardingResult>;
  updateCachedUser: (user: User) => Promise<User>;
}

export type StartPaywallSubscriptionResult =
  | { status: "completed"; plan: YourPlanTargets }
  | { status: "inactive" }
  | { status: "cancelled" };

function purchaseHasActiveEntitlement(purchase: Extract<RevenueCatPurchaseResult, { status: "purchased" }>): boolean {
  return Object.values(purchase.customerInfo.entitlements.active).some((entitlement) => entitlement.isActive);
}

export async function startPaywallSubscription({
  user,
  planId,
  purchasePlan,
  submit,
  updateCachedUser,
}: StartPaywallSubscriptionInput): Promise<StartPaywallSubscriptionResult> {
  if (!user?.id) {
    throw new Error("Sign in again to subscribe.");
  }

  const purchase = await purchasePlan({ planId, appUserId: user.id });
  if (purchase.status === "cancelled") {
    return { status: "cancelled" };
  }

  if (!purchaseHasActiveEntitlement(purchase)) {
    return { status: "inactive" };
  }

  const plan = await completePaywallOnboarding({
    submit,
    updateCachedUser,
    mapUser: (completedUser) =>
      applyRevenueCatCustomerInfoToUser(completedUser, purchase.customerInfo),
  });

  return { status: "completed", plan };
}
