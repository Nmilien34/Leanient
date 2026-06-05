import { describe, expect, it, vi } from "vitest";
import { completePaywallOnboarding } from "../../onboarding/paywallSubmit";
import { mockMedicationProtocol, mockProfile, mockWeightLogs } from "../../mocks/home";
import { mockUser } from "../../mocks/user";
import type { CompleteOnboardingResult } from "../../context/OnboardingContext";

function makeResult(): CompleteOnboardingResult {
  return {
    user: { ...mockUser, id: "user_1", onboardingComplete: true },
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

describe("completePaywallOnboarding", () => {
  it("updates cached auth user from the successful onboarding response", async () => {
    const result = makeResult();
    const submit = vi.fn().mockResolvedValue(result);
    const updateCachedUser = vi.fn().mockResolvedValue(result.user);

    const plan = await completePaywallOnboarding({ submit, updateCachedUser });

    expect(updateCachedUser).toHaveBeenCalledWith(result.user);
    expect(plan).toEqual({
      dailyProteinTarget: 158,
      dailyCalorieTarget: 1850,
      weeklyWorkoutTarget: 3,
    });
  });

  it("does not update cached auth user when onboarding submission fails", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("network"));
    const updateCachedUser = vi.fn();

    await expect(completePaywallOnboarding({ submit, updateCachedUser })).rejects.toThrow(
      "network",
    );

    expect(updateCachedUser).not.toHaveBeenCalled();
  });
});
