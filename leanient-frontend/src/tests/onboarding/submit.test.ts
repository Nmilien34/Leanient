import { describe, expect, it } from "vitest";
import { toOnboardingCompleteRequest } from "../../onboarding/submit";
import { emptyDraft, type OnboardingDraft } from "../../onboarding/draft";

const completeDraft: OnboardingDraft = {
  profile: {
    journeyStage: "active_loss",
    goalWeight: 172,
    goalWeightUnit: "lb",
    goalPace: "steady",
    biggestFear: "losing_muscle",
    trainingStatus: "consistent",
  },
  medicationProtocol: { medicationName: "Wegovy", doseUnit: "mg", shotDay: "sunday", startDate: "2026-04-20" },
  initialWeight: { value: 198, unit: "lb" },
  basics: { sexAssignedAtBirth: "female", age: 34, heightValue: 66, heightUnit: "in" },
};

describe("toOnboardingCompleteRequest", () => {
  it("assembles the shared OnboardingCompleteRequest from a complete draft", () => {
    const req = toOnboardingCompleteRequest(completeDraft);

    expect(req.profile).toMatchObject({
      journeyStage: "active_loss",
      goalWeight: 172,
      goalWeightUnit: "lb",
      goalPace: "steady",
      biggestFear: "losing_muscle",
      trainingStatus: "consistent",
    });
    // Raw biological inputs are sent; the backend computes the daily targets, so
    // they must NOT appear in the request body.
    expect(req.profile).toMatchObject({ sex: "female", ageYears: 34, heightInches: 66 });
    expect(req.profile).not.toHaveProperty("dailyProteinTarget");
    expect(req.profile).not.toHaveProperty("dailyCalorieTarget");
    // Training-derived fields are still filled by the shared helpers.
    expect(req.profile.equipmentAccess).toBeTruthy();
    expect(req.profile.weeklyWorkoutTarget).toBeGreaterThan(0);

    expect(req.medicationProtocol).toMatchObject({
      medicationName: "Wegovy",
      doseUnit: "mg",
      shotDay: "sunday",
      startDate: "2026-04-20",
      active: true,
    });
    expect(req.initialWeight).toMatchObject({ value: 198, unit: "lb" });
    expect(req.initialWeight.measuredAt).toBeTruthy();
  });

  it("throws a clear error when a required slot is missing", () => {
    expect(() => toOnboardingCompleteRequest(emptyDraft)).toThrow(/journeyStage/);
  });
});
