import { describe, expect, it } from "vitest";
import {
  extractPlanTargets,
  formatCalories,
  formatProtein,
  formatTraining,
} from "../../onboarding/yourPlan";
import type { CompleteOnboardingResult } from "../../context/OnboardingContext";
import { mockMedicationProtocol, mockProfile, mockWeightLogs } from "../../mocks/home";
import { mockUser } from "../../mocks/user";

function makeResult(
  targets: Partial<CompleteOnboardingResult["profile"]> = {},
): CompleteOnboardingResult {
  return {
    user: mockUser,
    profile: {
      ...mockProfile,
      dailyProteinTarget: 158,
      dailyCalorieTarget: 1850,
      weeklyWorkoutTarget: 3,
      ...targets,
    },
    medicationProtocol: mockMedicationProtocol,
    weightLog: mockWeightLogs[0],
  };
}

describe("extractPlanTargets", () => {
  it("reads the backend-computed targets from the onboarding response", () => {
    expect(extractPlanTargets(makeResult())).toEqual({
      dailyProteinTarget: 158,
      dailyCalorieTarget: 1850,
      weeklyWorkoutTarget: 3,
    });
  });

  it("reflects whatever the backend returned, not local estimates", () => {
    const plan = extractPlanTargets(
      makeResult({ dailyProteinTarget: 142, dailyCalorieTarget: 2010, weeklyWorkoutTarget: 2 }),
    );
    expect(plan).toEqual({
      dailyProteinTarget: 142,
      dailyCalorieTarget: 2010,
      weeklyWorkoutTarget: 2,
    });
  });
});

describe("plan formatters", () => {
  it("formats protein with a gram unit", () => {
    expect(formatProtein(158)).toBe("158 g");
  });

  it("formats calories with thousands grouping and a kcal unit", () => {
    expect(formatCalories(1850)).toBe("1,850 kcal");
    expect(formatCalories(950)).toBe("950 kcal");
  });

  it("pluralizes the weekly training sessions", () => {
    expect(formatTraining(3)).toBe("3 sessions");
    expect(formatTraining(1)).toBe("1 session");
  });
});
