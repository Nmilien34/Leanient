import { describe, expect, it } from "vitest";
import {
  computeNutritionTargets,
  computeTargetsForProfile,
  lbFromWeight,
  type NutritionTargetsInput,
} from "../../lib/nutrition";

const baseFemale: NutritionTargetsInput = {
  currentWeightLb: 198,
  goalWeightLb: 165,
  goalPace: "steady",
  sex: "female",
  ageYears: 34,
  heightInches: 65,
  trainingStatus: "beginner",
};

describe("computeNutritionTargets (Mifflin-St Jeor)", () => {
  it("computes deterministic targets for a steady female profile", () => {
    const targets = computeNutritionTargets(baseFemale);
    // BMR 1599, x1.375 TDEE, -500 steady deficit -> 1700; protein 1.6 g/kg.
    expect(targets).toEqual({ dailyProteinTarget: 144, dailyCalorieTarget: 1700 });
  });

  it("computes deterministic targets for an aggressive male profile", () => {
    const targets = computeNutritionTargets({
      currentWeightLb: 220,
      goalWeightLb: 190,
      goalPace: "aggressive",
      sex: "male",
      ageYears: 40,
      heightInches: 70,
      trainingStatus: "consistent",
    });
    expect(targets).toEqual({ dailyProteinTarget: 160, dailyCalorieTarget: 2220 });
  });

  it("applies the sex-specific calorie floor instead of going dangerously low", () => {
    const targets = computeNutritionTargets({
      currentWeightLb: 130,
      goalWeightLb: 120,
      goalPace: "aggressive",
      sex: "female",
      ageYears: 70,
      heightInches: 60,
      trainingStatus: "not_training",
    });
    expect(targets.dailyCalorieTarget).toBe(1200);
  });

  it("prescribes fewer calories as the pace gets more aggressive", () => {
    const gentle = computeNutritionTargets({ ...baseFemale, goalPace: "gentle" });
    const steady = computeNutritionTargets({ ...baseFemale, goalPace: "steady" });
    const aggressive = computeNutritionTargets({ ...baseFemale, goalPace: "aggressive" });

    expect(gentle.dailyCalorieTarget).toBeGreaterThan(steady.dailyCalorieTarget);
    expect(steady.dailyCalorieTarget).toBeGreaterThan(aggressive.dailyCalorieTarget);
  });

  it("gives males a higher BMR (more calories) than otherwise-identical females", () => {
    const male = computeNutritionTargets({ ...baseFemale, sex: "male" });
    const female = computeNutritionTargets(baseFemale);
    expect(male.dailyCalorieTarget).toBeGreaterThan(female.dailyCalorieTarget);
  });
});

describe("lbFromWeight", () => {
  it("passes pounds through and converts kilograms", () => {
    expect(lbFromWeight(180, "lb")).toBe(180);
    expect(lbFromWeight(80, "kg")).toBeCloseTo(176.37, 1);
  });
});

describe("computeTargetsForProfile", () => {
  const profile = {
    sex: "female" as const,
    ageYears: 34,
    heightInches: 65,
    goalPace: "steady" as const,
    goalWeight: 165,
    goalWeightUnit: "lb" as const,
    trainingStatus: "beginner" as const,
  };

  it("computes targets when all inputs are present", () => {
    expect(computeTargetsForProfile(profile, 198)).toEqual({
      dailyProteinTarget: 144,
      dailyCalorieTarget: 1700,
    });
  });

  it("returns null for a legacy profile missing a Mifflin input", () => {
    expect(computeTargetsForProfile({ ...profile, sex: undefined }, 198)).toBeNull();
    expect(computeTargetsForProfile({ ...profile, ageYears: undefined }, 198)).toBeNull();
    expect(computeTargetsForProfile({ ...profile, heightInches: undefined }, 198)).toBeNull();
  });
});
