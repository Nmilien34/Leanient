import type { UserMedicationProtocol, UserProfile, WeightLog } from "@leanient/shared";

/**
 * Typed Home fixtures for dev/screenshots. Swap for the live `LeanientDataContext`
 * (profile / weightLogs / medicationProtocol) at integration. Typed against shared.
 */
const STAMP = "2026-06-01T12:00:00.000Z";

export const mockProfile: UserProfile = {
  id: "profile_demo",
  userId: "user_demo",
  journeyStage: "active_loss",
  goalWeight: 172,
  goalWeightUnit: "lb",
  dailyProteinTarget: 120,
  dailyCalorieTarget: 1800,
  goalPace: "steady",
  biggestFear: "losing_muscle",
  trainingStatus: "consistent",
  equipmentAccess: "dumbbells",
  weeklyWorkoutTarget: 3,
  sideEffectBaseline: ["rough_shot_days"],
  timezone: "America/New_York",
  sex: "female",
  ageYears: 34,
  heightInches: 66,
  nutritionEngineVersion: "v2.0-mifflin-st-jeor",
  createdAt: STAMP,
  updatedAt: STAMP,
};

export const mockMedicationProtocol: UserMedicationProtocol = {
  id: "med_demo",
  userId: "user_demo",
  medicationCatalogId: "med_wegovy",
  medicationName: "Wegovy",
  doseAmount: 1,
  doseUnit: "mg",
  shotDay: "saturday",
  startDate: "2026-04-20",
  active: true,
  createdAt: STAMP,
  updatedAt: STAMP,
};

// Last ~5 weekly weigh-ins (oldest → newest) for the trend sparkline.
const weights = [198, 193, 189.4, 186, 184];
export const mockWeightLogs: WeightLog[] = weights.map((value, i) => ({
  id: `wl_${i}`,
  userId: "user_demo",
  value,
  unit: "lb",
  measuredAt: `2026-0${5}-0${i + 1}T08:00:00.000Z`,
  source: i === 0 ? "onboarding" : "weekly_checkin",
  createdAt: STAMP,
  updatedAt: STAMP,
}));
