import { describe, expect, it, vi } from "vitest";
import { startPaywallTrial } from "../../onboarding/paywallPurchase";
import { mockMedicationProtocol, mockProfile, mockWeightLogs } from "../../mocks/home";
import { mockUser } from "../../mocks/user";
import type { CompleteOnboardingResult } from "../../context/OnboardingContext";

function makeResult(): CompleteOnboardingResult {
  return {
    user: { ...mockUser, id: "user_1", onboardingComplete: true, subscriptionStatus: "free" },
    profile: {
      ...mockProfile,
      dailyProteinTarget: 158,
      dailyCalorieTarget: 1850,
      weeklyWorkoutTarget: 3,
    },
    medicationProtocol: mockMedicationProtocol,
    weightLog: mockWeightLogs[0],
  };
}

function makeCustomerInfo() {
  return {
    originalAppUserId: "user_1",
    entitlements: {
      active: {
        leanient_pro: {
          identifier: "leanient_pro",
          isActive: true,
          willRenew: true,
          periodType: "TRIAL",
          expirationDate: "2026-06-17T00:00:00.000Z",
        },
      },
      all: {},
    },
  };
}

describe("startPaywallTrial", () => {
  it("purchases before completing onboarding and caches the RevenueCat subscription state", async () => {
    const result = makeResult();
    const purchasePlan = vi.fn().mockResolvedValue({
      status: "purchased",
      customerInfo: makeCustomerInfo(),
    });
    const submit = vi.fn().mockResolvedValue(result);
    const updateCachedUser = vi.fn().mockResolvedValue(result.user);

    const outcome = await startPaywallTrial({
      user: { ...mockUser, id: "user_1" },
      planId: "annual",
      purchasePlan,
      submit,
      updateCachedUser,
    });

    expect(purchasePlan).toHaveBeenCalledWith({ planId: "annual", appUserId: "user_1" });
    expect(submit).toHaveBeenCalledOnce();
    expect(updateCachedUser).toHaveBeenCalledWith({
      ...result.user,
      subscriptionStatus: "trialing",
      subscriptionWillRenew: true,
      entitlementExpiresAt: "2026-06-17T00:00:00.000Z",
      revenueCatCustomerId: "user_1",
      revenueCatEntitlement: "leanient_pro",
    });
    expect(outcome.status).toBe("completed");
  });

  it("does not submit onboarding when the native purchase sheet is cancelled", async () => {
    const purchasePlan = vi.fn().mockResolvedValue({ status: "cancelled" });
    const submit = vi.fn();
    const updateCachedUser = vi.fn();

    const outcome = await startPaywallTrial({
      user: { ...mockUser, id: "user_1" },
      planId: "monthly",
      purchasePlan,
      submit,
      updateCachedUser,
    });

    expect(outcome).toEqual({ status: "cancelled" });
    expect(submit).not.toHaveBeenCalled();
    expect(updateCachedUser).not.toHaveBeenCalled();
  });
});
