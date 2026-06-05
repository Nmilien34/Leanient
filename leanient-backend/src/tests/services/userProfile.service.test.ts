import type {
  EquipmentAccess,
  GoalPace,
  JourneyStage,
  LeanientFocusArea,
  TrainingStatus,
  WeightUnit,
} from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockObjectId {
  toString: () => string;
}

interface MockProfileDocument {
  _id: MockObjectId;
  userId: MockObjectId | string;
  journeyStage: JourneyStage;
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  goalPace: GoalPace;
  biggestFear: LeanientFocusArea;
  trainingStatus: TrainingStatus;
  equipmentAccess?: EquipmentAccess;
  weeklyWorkoutTarget?: number;
  sideEffectBaseline: string[];
  timezone: string;
  sex?: "male" | "female";
  ageYears?: number;
  heightInches?: number;
  nutritionEngineVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  let profile: MockProfileDocument | null = null;

  function clone(document: MockProfileDocument): MockProfileDocument {
    return {
      ...document,
      _id: document._id,
      userId: document.userId,
      sideEffectBaseline: [...document.sideEffectBaseline],
    };
  }

  const UserProfileModel = {
    findOne: vi.fn(async () => (profile ? clone(profile) : null)),
    findOneAndUpdate: vi.fn(async (_filter, update) => {
      if (!profile) {
        return null;
      }

      profile = {
        ...profile,
        ...update.$set,
        updatedAt: new Date("2026-06-02T12:00:00.000Z"),
      };

      return clone(profile);
    }),
  };

  return {
    UserProfileModel,
    setProfile: (nextProfile: MockProfileDocument | null) => {
      profile = nextProfile ? clone(nextProfile) : null;
    },
    getProfile: () => profile,
    reset: () => {
      profile = null;
      UserProfileModel.findOne.mockClear();
      UserProfileModel.findOneAndUpdate.mockClear();
    },
  };
});

vi.mock("../../models/userProfile.model", () => ({
  UserProfileModel: modelMocks.UserProfileModel,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: {
    findOne: vi.fn(async () => null),
  },
}));

vi.mock("../../models/weightLog.model", () => ({
  WeightLogModel: {
    findOne: vi.fn(() => ({
      sort: vi.fn(async () => null),
    })),
  },
}));

import { getUserProfile, patchUserProfile } from "../../services/userProfile.service";

function objectId(value: string): MockObjectId {
  return { toString: () => value };
}

function legacyProfile(overrides: Partial<MockProfileDocument> = {}): MockProfileDocument {
  return {
    _id: objectId("profile_1"),
    userId: objectId("user_1"),
    journeyStage: "active_loss",
    goalWeight: 165,
    goalWeightUnit: "lb",
    dailyProteinTarget: 120,
    dailyCalorieTarget: 1800,
    goalPace: "steady",
    biggestFear: "losing_muscle",
    trainingStatus: "beginner",
    sideEffectBaseline: [],
    timezone: "America/New_York",
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    updatedAt: new Date("2026-06-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("user profile service", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("lazy-migrates missing equipment access and weekly workout target on read", async () => {
    modelMocks.setProfile(legacyProfile({ trainingStatus: "beginner" }));

    const result = await getUserProfile("user_1");

    expect(result.equipmentAccess).toBe("bodyweight_only");
    expect(result.weeklyWorkoutTarget).toBe(2);
    expect(modelMocks.UserProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "user_1" },
      {
        $set: {
          equipmentAccess: "bodyweight_only",
          weeklyWorkoutTarget: 2,
          // Legacy profiles are also stamped with the old engine version on read.
          nutritionEngineVersion: "v1.0-heuristic",
        },
      },
      expect.objectContaining({ new: true, runValidators: true }),
    );
  });

  it("flags a legacy profile that is missing nutrition inputs", async () => {
    modelMocks.setProfile(
      legacyProfile({
        equipmentAccess: "bodyweight_only",
        weeklyWorkoutTarget: 2,
        nutritionEngineVersion: "v1.0-heuristic",
      }),
    );

    const result = await getUserProfile("user_1");

    expect(result.needsNutritionInputUpdate).toBe(true);
    expect(result.nutritionEngineVersion).toBe("v1.0-heuristic");
  });

  it("recomputes calorie targets when sex/age/height are supplied for a legacy profile", async () => {
    modelMocks.setProfile(
      legacyProfile({
        equipmentAccess: "bodyweight_only",
        weeklyWorkoutTarget: 2,
        nutritionEngineVersion: "v1.0-heuristic",
        dailyProteinTarget: 120,
        dailyCalorieTarget: 1800,
      }),
    );

    const result = await patchUserProfile("user_1", {
      sex: "female",
      ageYears: 34,
      heightInches: 65,
    });

    expect(result.sex).toBe("female");
    // Mifflin-St Jeor, no weight log -> goal-weight (165 lb) fallback.
    expect(result.dailyCalorieTarget).toBe(1490);
    expect(result.nutritionEngineVersion).toBe("v2.0-mifflin-st-jeor");
    expect(result.needsNutritionInputUpdate).toBeUndefined();
  });

  it("recomputes weekly target when training status changes", async () => {
    modelMocks.setProfile(
      legacyProfile({
        trainingStatus: "beginner",
        equipmentAccess: "bodyweight_only",
        weeklyWorkoutTarget: 2,
      }),
    );

    const result = await patchUserProfile("user_1", { trainingStatus: "consistent" });

    expect(result.trainingStatus).toBe("consistent");
    expect(result.weeklyWorkoutTarget).toBe(3);
    expect(result.equipmentAccess).toBe("dumbbells");
    expect(modelMocks.getProfile()).toMatchObject({
      trainingStatus: "consistent",
      equipmentAccess: "dumbbells",
      weeklyWorkoutTarget: 3,
    });
  });
});
