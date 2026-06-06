import type {
  DoseUnit,
  GoalPace,
  JourneyStage,
  LeanientFocusArea,
  TrainingStatus,
  Weekday,
  WeightUnit,
} from "@leanient/shared";
import type { Express } from "express";
import type * as MongooseModule from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

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
  shotDays: Weekday[];
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
  const profiles: MockProfileDocument[] = [];
  const medicationProtocols: MockMedicationProtocolDocument[] = [];
  const weightLogs: MockWeightLogDocument[] = [];
  const users: MockUserDocument[] = [];

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
    findOneAndUpdate: vi.fn(async (filter, update, _options: FindOneAndUpdateOptions = {}) => {
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
    findOneAndUpdate: vi.fn(async (filter, update, _options: FindOneAndUpdateOptions = {}) => {
      if (failMedicationWrite) {
        throw new Error("Medication write failed");
      }

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
    findOneAndUpdate: vi.fn(async (filter, update, _options: FindOneAndUpdateOptions = {}) => {
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
    findByIdAndUpdate: vi.fn(async (userId, update, _options: FindOneAndUpdateOptions = {}) => {
      let user = users.find((storedUser) => storedUser._id.toString() === userId);
      if (!user) {
        user = {
          _id: { toString: () => userId },
          emailVerified: true,
          onboardingComplete: false,
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
      }
      Object.assign(user, update.$set);
      return user;
    }),
  };

  return {
    profiles,
    medicationProtocols,
    weightLogs,
    users,
    mongoose,
    UserProfileModel,
    UserMedicationProtocolModel,
    WeightLogModel,
    UserModel,
    setFailMedicationWrite: (value: boolean) => {
      failMedicationWrite = value;
    },
    reset: () => {
      nextId = 1;
      failMedicationWrite = false;
      profiles.splice(0, profiles.length);
      medicationProtocols.splice(0, medicationProtocols.length);
      weightLogs.splice(0, weightLogs.length);
      users.splice(0, users.length);
      mongoose.connection.transaction.mockClear();
      UserProfileModel.findOne.mockClear();
      UserProfileModel.findOneAndUpdate.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
      UserMedicationProtocolModel.findOneAndUpdate.mockClear();
      WeightLogModel.findOne.mockClear();
      WeightLogModel.findOneAndUpdate.mockClear();
      UserModel.findById.mockClear();
      UserModel.findByIdAndUpdate.mockClear();
    },
  };
});

vi.mock("mongoose", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof MongooseModule;
  actual.default.connection.transaction = modelMocks.mongoose.connection.transaction;
  return actual;
});

vi.mock("../models/userProfile.model", () => ({
  UserProfileModel: modelMocks.UserProfileModel,
}));

vi.mock("../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
  resolveShotDays: (protocol: { shotDays?: string[]; shotDay?: string }) => {
    if (Array.isArray(protocol.shotDays) && protocol.shotDays.length > 0) {
      return protocol.shotDays;
    }
    return protocol.shotDay ? [protocol.shotDay] : [];
  },
}));

vi.mock("../models/weightLog.model", () => ({
  WeightLogModel: modelMocks.WeightLogModel,
}));

vi.mock("../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

import { createApp } from "../server";

function makeOnboardingRequest(overrides: { value?: number } = {}) {
  return {
    profile: {
      journeyStage: "active_loss" as const,
      goalWeight: 165,
      goalWeightUnit: "lb" as const,
      goalPace: "steady" as const,
      biggestFear: "losing_muscle" as const,
      trainingStatus: "beginner" as const,
      sideEffectBaseline: ["nausea"],
      timezone: "America/New_York",
      // Mifflin inputs: the backend computes protein/calorie targets from these.
      sex: "female" as const,
      ageYears: 34,
      heightInches: 65,
    },
    medicationProtocol: {
      medicationName: "semaglutide",
      doseAmount: 0.5,
      doseUnit: "mg" as const,
      shotDays: ["monday"] as const,
      startDate: "2026-05-04",
      active: true,
    },
    initialWeight: {
      value: overrides.value ?? 184,
      unit: "lb" as const,
      measuredAt: "2026-06-02T12:00:00.000Z",
    },
  };
}

describe("onboarding routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    modelMocks.reset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("completes onboarding for a fresh user with one of each required record", async () => {
    const response = await request(app)
      .post("/onboarding/complete")
      .set("Authorization", authorization)
      .send(makeOnboardingRequest());

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
    });
    expect(modelMocks.profiles).toHaveLength(1);
    expect(modelMocks.medicationProtocols).toHaveLength(1);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.users).toHaveLength(1);
    expect(modelMocks.users[0]?.onboardingComplete).toBe(true);
    expect(modelMocks.users[0]?.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(modelMocks.weightLogs[0]).toMatchObject({
      userId: "user_1",
      value: 184,
      source: "onboarding",
    });
    expect(modelMocks.weightLogs[0]?.weekOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps onboarding idempotent when the same user posts twice", async () => {
    const firstResponse = await request(app)
      .post("/onboarding/complete")
      .set("Authorization", authorization)
      .send(makeOnboardingRequest({ value: 184 }));
    const secondResponse = await request(app)
      .post("/onboarding/complete")
      .set("Authorization", authorization)
      .send(makeOnboardingRequest({ value: 182 }));

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstResponse.body.data.user).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
    });
    expect(secondResponse.body.data.user).toMatchObject({
      id: "user_1",
      onboardingComplete: true,
    });
    expect(modelMocks.profiles).toHaveLength(1);
    expect(modelMocks.medicationProtocols).toHaveLength(1);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.users).toHaveLength(1);
    expect(modelMocks.weightLogs[0]).toMatchObject({
      value: 184,
      weekOf: "2026-06-01",
    });
    expect(modelMocks.UserProfileModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(modelMocks.UserMedicationProtocolModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(modelMocks.WeightLogModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("rolls back partial onboarding state when a transactional write fails", async () => {
    modelMocks.setFailMedicationWrite(true);

    const response = await request(app)
      .post("/onboarding/complete")
      .set("Authorization", authorization)
      .send(makeOnboardingRequest());

    expect(response.status).toBe(500);
    expect(modelMocks.profiles).toHaveLength(0);
    expect(modelMocks.medicationProtocols).toHaveLength(0);
    expect(modelMocks.weightLogs).toHaveLength(0);
    expect(modelMocks.users).toHaveLength(0);
  });
});
