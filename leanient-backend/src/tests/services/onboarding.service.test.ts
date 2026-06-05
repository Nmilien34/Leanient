import type {
  DoseUnit,
  EquipmentAccess,
  GoalPace,
  JourneyStage,
  LeanientFocusArea,
  TrainingStatus,
  Weekday,
  WeightUnit,
} from "@leanient/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockObjectId {
  toString: () => string;
}

interface MockQuery<T> {
  session: (session: unknown) => Promise<T>;
}

interface MockProfileDocument {
  _id: MockObjectId;
  userId: string;
  journeyStage: JourneyStage;
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  goalPace: GoalPace;
  biggestFear: LeanientFocusArea;
  trainingStatus: TrainingStatus;
  equipmentAccess: EquipmentAccess;
  weeklyWorkoutTarget: number;
  sideEffectBaseline: string[];
  timezone: string;
  sex?: "male" | "female";
  ageYears?: number;
  heightInches?: number;
  nutritionEngineVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockMedicationProtocolDocument {
  _id: MockObjectId;
  userId: string;
  medicationName: string;
  customMedicationName?: string;
  doseAmount?: number;
  doseUnit: DoseUnit;
  shotDay: Weekday;
  startDate: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockWeightLogDocument {
  _id: MockObjectId;
  userId: string;
  weekOf?: string;
  value: number;
  unit: WeightUnit;
  measuredAt: Date;
  source: "onboarding";
  createdAt: Date;
  updatedAt: Date;
}

interface MockUserDocument {
  _id: MockObjectId;
  email?: string;
  emailVerified: boolean;
  onboardingComplete: boolean;
  onboardingCompletedAt?: Date;
  authProviders: Array<{
    provider: "google";
    providerUserId: string;
    linkedAt: Date;
  }>;
  displayName?: string;
  avatarUrl?: string;
  subscriptionStatus: "free";
  entitlementExpiresAt?: Date;
  subscriptionWillRenew: boolean;
  revenueCatCustomerId?: string;
  revenueCatEntitlement?: string;
  createdAt: Date;
  updatedAt: Date;
}

type ProfilePatch = Omit<MockProfileDocument, "_id" | "userId" | "createdAt" | "updatedAt">;
type MedicationPatch = Omit<
  MockMedicationProtocolDocument,
  "_id" | "userId" | "createdAt" | "updatedAt"
>;

interface FindOneAndUpdateOptions {
  session?: unknown;
}

const modelMocks = vi.hoisted(() => {
  let nextId = 1;
  let failMedicationWrite = false;
  let failWeightLogWrite = false;
  const profiles: MockProfileDocument[] = [];
  const medicationProtocols: MockMedicationProtocolDocument[] = [];
  const weightLogs: MockWeightLogDocument[] = [];
  const users: MockUserDocument[] = [];
  const writeCalls: string[] = [];

  function objectId(prefix: string): MockObjectId {
    const id = `${prefix}_${nextId}`;
    nextId += 1;
    return {
      toString: () => id,
    };
  }

  function timestamps() {
    const now = new Date("2026-06-01T12:00:00.000Z");
    return {
      createdAt: now,
      updatedAt: now,
    };
  }

  function cloneProfile(profile: MockProfileDocument): MockProfileDocument {
    return {
      ...profile,
      _id: profile._id,
      sideEffectBaseline: [...profile.sideEffectBaseline],
    };
  }

  function cloneMedication(
    medication: MockMedicationProtocolDocument,
  ): MockMedicationProtocolDocument {
    return {
      ...medication,
      _id: medication._id,
    };
  }

  function cloneWeightLog(weightLog: MockWeightLogDocument): MockWeightLogDocument {
    return {
      ...weightLog,
      _id: weightLog._id,
      measuredAt: new Date(weightLog.measuredAt),
    };
  }

  function cloneUser(user: MockUserDocument): MockUserDocument {
    return {
      ...user,
      _id: user._id,
      authProviders: user.authProviders.map((authProvider) => ({
        ...authProvider,
        linkedAt: new Date(authProvider.linkedAt),
      })),
      onboardingCompletedAt: user.onboardingCompletedAt
        ? new Date(user.onboardingCompletedAt)
        : undefined,
      entitlementExpiresAt: user.entitlementExpiresAt
        ? new Date(user.entitlementExpiresAt)
        : undefined,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  function restoreCollection<T>(target: T[], snapshot: T[]): void {
    target.splice(0, target.length, ...snapshot);
  }

  const mongoose = {
    connection: {
      transaction: vi.fn(async (callback: (session: unknown) => Promise<unknown>) => {
        const snapshot = {
          profiles: profiles.map(cloneProfile),
          medicationProtocols: medicationProtocols.map(cloneMedication),
          weightLogs: weightLogs.map(cloneWeightLog),
          users: users.map(cloneUser),
        };

        try {
          return await callback({ id: "session_1" });
        } catch (error) {
          restoreCollection(profiles, snapshot.profiles);
          restoreCollection(medicationProtocols, snapshot.medicationProtocols);
          restoreCollection(weightLogs, snapshot.weightLogs);
          restoreCollection(users, snapshot.users);
          throw error;
        }
      }),
    },
  };

  function query<T>(resolver: (session?: unknown) => Promise<T>): MockQuery<T> {
    return {
      session: async (session: unknown) => resolver(session),
    };
  }

  const UserProfileModel = {
    findOne: vi.fn((filter) => {
      return query(async () => profiles.find((profile) => profile.userId === filter.userId) ?? null);
    }),
    findOneAndUpdate: vi.fn(async (filter, update, options: FindOneAndUpdateOptions = {}) => {
      writeCalls.push(options.session ? "profile:session" : "profile:no-session");
      let profile = profiles.find((storedProfile) => storedProfile.userId === filter.userId);
      if (!profile) {
        profile = {
          _id: objectId("profile"),
          userId: filter.userId,
          ...(update.$set as ProfilePatch),
          ...timestamps(),
        };
        profiles.push(profile);
      } else {
        Object.assign(profile, update.$set);
      }
      return profile;
    }),
  };

  const UserMedicationProtocolModel = {
    findOne: vi.fn((filter) => {
      return query(
        async () =>
          medicationProtocols.find((protocol) => protocol.userId === filter.userId) ?? null,
      );
    }),
    findOneAndUpdate: vi.fn(async (filter, update, options: FindOneAndUpdateOptions = {}) => {
      if (failMedicationWrite) {
        throw new Error("Medication write failed");
      }
      writeCalls.push(options.session ? "medication:session" : "medication:no-session");
      let medication = medicationProtocols.find((protocol) => protocol.userId === filter.userId);
      if (!medication) {
        medication = {
          _id: objectId("medication"),
          userId: filter.userId,
          ...(update.$set as MedicationPatch),
          active: (update.$set as MedicationPatch).active ?? true,
          ...timestamps(),
        };
        medicationProtocols.push(medication);
      } else {
        Object.assign(medication, update.$set);
      }
      return medication;
    }),
  };

  const WeightLogModel = {
    findOne: vi.fn((filter) => {
      return query(
        async () =>
          weightLogs.find((weightLog) => {
            return weightLog.userId === filter.userId && weightLog.source === filter.source;
          }) ?? null,
      );
    }),
    create: vi.fn(async (data) => {
      const weightLog: MockWeightLogDocument = {
        _id: objectId("weight_log"),
        ...data,
        ...timestamps(),
      };
      weightLogs.push(weightLog);
      return weightLog;
    }),
    findOneAndUpdate: vi.fn(async (filter, update, options: FindOneAndUpdateOptions = {}) => {
      if (failWeightLogWrite) {
        throw new Error("Weight log write failed");
      }
      writeCalls.push(options.session ? "weightLog:session" : "weightLog:no-session");
      let weightLog = weightLogs.find((storedWeightLog) => {
        return storedWeightLog.userId === filter.userId && storedWeightLog.weekOf === filter.weekOf;
      });
      if (!weightLog) {
        weightLog = {
          _id: objectId("weight_log"),
          userId: filter.userId,
          weekOf: filter.weekOf,
          value: 0,
          unit: "lb",
          measuredAt: new Date("2026-06-01T12:00:00.000Z"),
          source: "onboarding",
          ...timestamps(),
        };
        weightLogs.push(weightLog);
      }
      Object.assign(weightLog, update.$set);
      return weightLog;
    }),
  };

  const UserModel = {
    findById: vi.fn((userId) => {
      return query(async () => users.find((user) => user._id.toString() === userId) ?? null);
    }),
    findByIdAndUpdate: vi.fn(async (userId, update, options: FindOneAndUpdateOptions = {}) => {
      writeCalls.push(options.session ? "user:session" : "user:no-session");
      const user = users.find((storedUser) => storedUser._id.toString() === userId);
      if (!user) {
        return null;
      }
      Object.assign(user, update.$set);
      return user;
    }),
  };

  function createUser(userId: string, onboardingComplete = false): MockUserDocument {
    const user: MockUserDocument = {
      _id: { toString: () => userId },
      emailVerified: true,
      onboardingComplete,
      onboardingCompletedAt: onboardingComplete
        ? new Date("2026-06-01T12:00:00.000Z")
        : undefined,
      authProviders: [
        {
          provider: "google",
          providerUserId: `google_${userId}`,
          linkedAt: new Date("2026-06-01T12:00:00.000Z"),
        },
      ],
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
      createdAt: new Date("2026-06-01T12:00:00.000Z"),
      updatedAt: new Date("2026-06-01T12:00:00.000Z"),
    };
    users.push(user);
    return user;
  }

  return {
    profiles,
    medicationProtocols,
    weightLogs,
    users,
    writeCalls,
    mongoose,
    UserProfileModel,
    UserMedicationProtocolModel,
    WeightLogModel,
    UserModel,
    createUser,
    setFailMedicationWrite: (value: boolean) => {
      failMedicationWrite = value;
    },
    setFailWeightLogWrite: (value: boolean) => {
      failWeightLogWrite = value;
    },
    reset: () => {
      nextId = 1;
      failMedicationWrite = false;
      failWeightLogWrite = false;
      profiles.splice(0, profiles.length);
      medicationProtocols.splice(0, medicationProtocols.length);
      weightLogs.splice(0, weightLogs.length);
      users.splice(0, users.length);
      writeCalls.splice(0, writeCalls.length);
      mongoose.connection.transaction.mockClear();
      UserProfileModel.findOne.mockClear();
      UserProfileModel.findOneAndUpdate.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
      UserMedicationProtocolModel.findOneAndUpdate.mockClear();
      WeightLogModel.findOne.mockClear();
      WeightLogModel.create.mockClear();
      WeightLogModel.findOneAndUpdate.mockClear();
      UserModel.findById.mockClear();
      UserModel.findByIdAndUpdate.mockClear();
    },
  };
});

vi.mock("mongoose", () => ({
  default: modelMocks.mongoose,
}));

vi.mock("../../models/userProfile.model", () => ({
  UserProfileModel: modelMocks.UserProfileModel,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../../models/weightLog.model", () => ({
  WeightLogModel: modelMocks.WeightLogModel,
}));

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

import { completeOnboarding } from "../../services/onboarding.service";

function makeOnboardingRequest() {
  return {
    profile: {
      journeyStage: "active_loss" as const,
      goalWeight: 165,
      goalWeightUnit: "lb" as const,
      goalPace: "steady" as const,
      biggestFear: "losing_muscle" as const,
      trainingStatus: "beginner" as const,
      sideEffectBaseline: ["fatigue"],
      timezone: "America/New_York",
      // Mifflin inputs: the backend computes protein/calorie targets from these.
      sex: "female" as const,
      ageYears: 34,
      heightInches: 65,
    },
    medicationProtocol: {
      medicationName: "Zepbound",
      doseAmount: 5,
      doseUnit: "mg" as const,
      shotDay: "monday" as const,
      startDate: "2026-05-01",
      active: true,
    },
    initialWeight: {
      value: 184,
      unit: "lb" as const,
      measuredAt: "2026-06-02T12:00:00.000Z",
    },
  };
}

describe("onboarding service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T15:00:00.000Z"));
    modelMocks.reset();
    modelMocks.createUser("user_1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits profile, medication protocol, onboarding weight log, and user completion flag", async () => {
    const result = await completeOnboarding("user_1", makeOnboardingRequest());

    expect(modelMocks.profiles).toHaveLength(1);
    expect(modelMocks.medicationProtocols).toHaveLength(1);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.users[0]).toMatchObject({
      onboardingComplete: true,
      onboardingCompletedAt: new Date("2026-06-02T15:00:00.000Z"),
    });
    expect(modelMocks.weightLogs[0]).toMatchObject({
      userId: "user_1",
      weekOf: "2026-06-01",
      value: 184,
      source: "onboarding",
    });
    expect(result.profile.goalWeight).toBe(165);
    expect(result.user).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
    });
    expect(result.profile.equipmentAccess).toBe("bodyweight_only");
    expect(result.profile.weeklyWorkoutTarget).toBe(2);
    expect(result.medicationProtocol.medicationName).toBe("Zepbound");
    expect(result.weightLog.value).toBe(184);
    expect(modelMocks.writeCalls).toEqual([
      "profile:session",
      "medication:session",
      "weightLog:session",
      "user:session",
    ]);
  });

  it("is idempotent when onboarding is submitted twice", async () => {
    await completeOnboarding("user_1", makeOnboardingRequest());
    modelMocks.users[0]!.onboardingComplete = false;
    modelMocks.users[0]!.onboardingCompletedAt = undefined;
    await completeOnboarding("user_1", makeOnboardingRequest());

    expect(modelMocks.profiles).toHaveLength(1);
    expect(modelMocks.medicationProtocols).toHaveLength(1);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.users[0]?.onboardingComplete).toBe(true);
  });

  it("respects explicit equipment access and computes weekly target from training status", async () => {
    const body = makeOnboardingRequest();
    body.profile.trainingStatus = "consistent";
    body.profile.equipmentAccess = "full_gym";

    const result = await completeOnboarding("user_1", body);

    expect(result.profile.equipmentAccess).toBe("full_gym");
    expect(result.profile.weeklyWorkoutTarget).toBe(3);
    expect(modelMocks.profiles[0]).toMatchObject({
      equipmentAccess: "full_gym",
      weeklyWorkoutTarget: 3,
    });
  });

  it("rolls back all writes when medication protocol write fails", async () => {
    modelMocks.setFailMedicationWrite(true);

    await expect(completeOnboarding("user_1", makeOnboardingRequest())).rejects.toThrow(
      "Medication write failed",
    );

    expect(modelMocks.profiles).toHaveLength(0);
    expect(modelMocks.medicationProtocols).toHaveLength(0);
    expect(modelMocks.weightLogs).toHaveLength(0);
    expect(modelMocks.users[0]?.onboardingComplete).toBe(false);
  });

  it("rolls back all writes when onboarding weight log write fails", async () => {
    modelMocks.setFailWeightLogWrite(true);

    await expect(completeOnboarding("user_1", makeOnboardingRequest())).rejects.toThrow(
      "Weight log write failed",
    );

    expect(modelMocks.profiles).toHaveLength(0);
    expect(modelMocks.medicationProtocols).toHaveLength(0);
    expect(modelMocks.weightLogs).toHaveLength(0);
    expect(modelMocks.users[0]?.onboardingComplete).toBe(false);
  });

  it("returns cached onboarding state without writes when user already completed onboarding", async () => {
    await completeOnboarding("user_1", makeOnboardingRequest());
    modelMocks.writeCalls.splice(0, modelMocks.writeCalls.length);

    const result = await completeOnboarding("user_1", makeOnboardingRequest());

    expect(result.user).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
    });
    expect(result.profile.goalWeight).toBe(165);
    expect(result.medicationProtocol.medicationName).toBe("Zepbound");
    expect(result.weightLog.value).toBe(184);
    expect(modelMocks.writeCalls).toEqual([]);
    expect(modelMocks.mongoose.connection.transaction).toHaveBeenCalledTimes(1);
  });
});
