import type { SubscriptionStatus, WeightUnit } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppError } from "../../lib/errors";

interface MockUser {
  _id: {
    toString: () => string;
  };
  onboardingComplete: boolean;
  subscriptionStatus: SubscriptionStatus;
}

interface MockProfile {
  userId: string;
  biggestFear: "losing_muscle" | "ozempic_face";
  goalPace: "steady";
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  trainingStatus: "beginner";
}

interface MockWeightLog {
  userId: string;
  value: number;
  unit: WeightUnit;
  measuredAt: Date;
}

interface MockWeeklyCheckin {
  userId: string;
  weekOf: string;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
}

interface MockMealLog {
  userId: string;
  protein: number;
  recordedAt: Date;
}

interface MockWorkoutLog {
  userId: string;
  recordedAt: Date;
  countsAsResistance?: boolean;
}

interface MockDoseLog {
  userId: string;
  recordedAt: Date;
}

interface MockMedicationProtocol {
  userId: string;
  medicationName: string;
  shotDay: "monday";
  startDate: string;
  active: boolean;
}

const modelMocks = vi.hoisted(() => {
  const users: MockUser[] = [];
  const profiles: MockProfile[] = [];
  const weightLogs: MockWeightLog[] = [];
  const checkins: MockWeeklyCheckin[] = [];
  const mealLogs: MockMealLog[] = [];
  const workoutLogs: MockWorkoutLog[] = [];
  const doseLogs: MockDoseLog[] = [];
  const protocols: MockMedicationProtocol[] = [];

  function createUser(
    userId: string,
    onboardingComplete = true,
    subscriptionStatus: SubscriptionStatus = "active",
  ) {
    const user = {
      _id: {
        toString: () => userId,
      },
      onboardingComplete,
      subscriptionStatus,
    };
    users.push(user);
    return user;
  }

  function createProfile(userId: string, overrides: Partial<MockProfile> = {}) {
    const profile = {
      userId,
      biggestFear: "losing_muscle" as const,
      goalPace: "steady" as const,
      goalWeight: 165,
      goalWeightUnit: "lb" as const,
      dailyProteinTarget: 120,
      dailyCalorieTarget: 1800,
      trainingStatus: "beginner" as const,
      ...overrides,
    };
    profiles.push(profile);
    return profile;
  }

  const UserModel = {
    findById: vi.fn(async (userId: string) => {
      return users.find((user) => user._id.toString() === userId) ?? null;
    }),
  };

  const UserProfileModel = {
    findOne: vi.fn(async (filter: { userId: string }) => {
      return profiles.find((profile) => profile.userId === filter.userId) ?? null;
    }),
  };

  const WeightLogModel = {
    find: vi.fn((filter: { userId: string; measuredAt?: { $gte?: Date; $lte?: Date } }) => {
      return {
        sort: vi.fn(async () => {
          return weightLogs
            .filter((log) => {
              const gte = filter.measuredAt?.$gte;
              const lte = filter.measuredAt?.$lte;
              return (
                log.userId === filter.userId &&
                (!gte || log.measuredAt >= gte) &&
                (!lte || log.measuredAt <= lte)
              );
            })
            .sort((left, right) => left.measuredAt.getTime() - right.measuredAt.getTime());
        }),
      };
    }),
  };

  const WeeklyCheckinModel = {
    find: vi.fn((filter: { userId: string; weekOf?: { $gte?: string; $lte?: string } }) => {
      return {
        sort: vi.fn(async () => {
          return checkins
            .filter((checkin) => {
              const gte = filter.weekOf?.$gte;
              const lte = filter.weekOf?.$lte;
              return (
                checkin.userId === filter.userId &&
                (!gte || checkin.weekOf >= gte) &&
                (!lte || checkin.weekOf <= lte)
              );
            })
            .sort((left, right) => left.weekOf.localeCompare(right.weekOf));
        }),
      };
    }),
  };

  function filterRecordedLogs<TLog extends { userId: string; recordedAt: Date }>(
    logs: TLog[],
    filter: { userId: string; recordedAt?: { $gte?: Date; $lte?: Date } },
  ) {
    return logs
      .filter((log) => {
        const gte = filter.recordedAt?.$gte;
        const lte = filter.recordedAt?.$lte;
        return (
          log.userId === filter.userId &&
          (!gte || log.recordedAt >= gte) &&
          (!lte || log.recordedAt <= lte)
        );
      })
      .sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime());
  }

  const MealLogModel = {
    find: vi.fn((filter: { userId: string; recordedAt?: { $gte?: Date; $lte?: Date } }) => {
      return {
        sort: vi.fn(async () => filterRecordedLogs(mealLogs, filter)),
      };
    }),
  };

  const WorkoutLogModel = {
    find: vi.fn((filter: { userId: string; recordedAt?: { $gte?: Date; $lte?: Date } }) => {
      return {
        sort: vi.fn(async () => filterRecordedLogs(workoutLogs, filter)),
      };
    }),
  };

  const DoseLogModel = {
    find: vi.fn((filter: { userId: string; recordedAt?: { $gte?: Date; $lte?: Date } }) => {
      return {
        sort: vi.fn(async () => filterRecordedLogs(doseLogs, filter)),
      };
    }),
  };

  const UserMedicationProtocolModel = {
    findOne: vi.fn(async (filter: { userId: string; active?: boolean }) => {
      return (
        protocols.find(
          (protocol) =>
            protocol.userId === filter.userId &&
            (filter.active === undefined || protocol.active === filter.active),
        ) ?? null
      );
    }),
  };

  return {
    checkins,
    mealLogs,
    workoutLogs,
    doseLogs,
    protocols,
    profiles,
    users,
    weightLogs,
    UserModel,
    UserProfileModel,
    WeightLogModel,
    WeeklyCheckinModel,
    MealLogModel,
    WorkoutLogModel,
    DoseLogModel,
    UserMedicationProtocolModel,
    createProfile,
    createUser,
    reset: () => {
      users.splice(0, users.length);
      profiles.splice(0, profiles.length);
      weightLogs.splice(0, weightLogs.length);
      checkins.splice(0, checkins.length);
      mealLogs.splice(0, mealLogs.length);
      workoutLogs.splice(0, workoutLogs.length);
      doseLogs.splice(0, doseLogs.length);
      protocols.splice(0, protocols.length);
      UserModel.findById.mockClear();
      UserProfileModel.findOne.mockClear();
      WeightLogModel.find.mockClear();
      WeeklyCheckinModel.find.mockClear();
      MealLogModel.find.mockClear();
      WorkoutLogModel.find.mockClear();
      DoseLogModel.find.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
    },
  };
});

const coachMocks = vi.hoisted(() => ({
  generateStallDiagnostic: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../../models/userProfile.model", () => ({
  UserProfileModel: modelMocks.UserProfileModel,
}));

vi.mock("../../models/weightLog.model", () => ({
  WeightLogModel: modelMocks.WeightLogModel,
}));

vi.mock("../../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../../models/mealLog.model", () => ({
  MealLogModel: modelMocks.MealLogModel,
}));

vi.mock("../../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.WorkoutLogModel,
}));

vi.mock("../../models/doseLog.model", () => ({
  DoseLogModel: modelMocks.DoseLogModel,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../../services/coachContent.service", async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    generateStallDiagnostic: coachMocks.generateStallDiagnostic,
  };
});

vi.mock("../../lib/logger", () => ({
  logger: {
    warn: coachMocks.loggerWarn,
  },
}));

import { getStallDiagnostic } from "../../services/stallDiagnostic.service";

const NOW = new Date("2026-06-02T12:00:00.000Z");

function seedStalledWeights(userId = "user_1") {
  modelMocks.weightLogs.push(
    { userId, value: 184.4, unit: "lb", measuredAt: new Date("2026-05-09T12:00:00.000Z") },
    { userId, value: 184.2, unit: "lb", measuredAt: new Date("2026-05-18T12:00:00.000Z") },
    { userId, value: 184.1, unit: "lb", measuredAt: new Date("2026-05-25T12:00:00.000Z") },
    { userId, value: 184.0, unit: "lb", measuredAt: new Date("2026-06-01T12:00:00.000Z") },
  );
}

function seedHealthyLossWeights(userId = "user_1") {
  modelMocks.weightLogs.push(
    { userId, value: 185.8, unit: "lb", measuredAt: new Date("2026-05-09T12:00:00.000Z") },
    { userId, value: 184.8, unit: "lb", measuredAt: new Date("2026-05-18T12:00:00.000Z") },
    { userId, value: 184.3, unit: "lb", measuredAt: new Date("2026-05-25T12:00:00.000Z") },
    { userId, value: 184.0, unit: "lb", measuredAt: new Date("2026-06-01T12:00:00.000Z") },
  );
}

function seedTrendCheckins(userId = "user_1") {
  modelMocks.checkins.push(
    { userId, weekOf: "2026-05-05", proteinGramsPerDay: 130, resistanceWorkoutsCompleted: 3 },
    { userId, weekOf: "2026-05-12", proteinGramsPerDay: 120, resistanceWorkoutsCompleted: 2 },
    { userId, weekOf: "2026-05-20", proteinGramsPerDay: 100, resistanceWorkoutsCompleted: 1 },
    { userId, weekOf: "2026-05-27", proteinGramsPerDay: 90, resistanceWorkoutsCompleted: 1 },
  );
}

function seedMealLogs(userId = "user_1") {
  modelMocks.mealLogs.push(
    { userId, protein: 130, recordedAt: new Date("2026-05-08T12:00:00.000Z") },
    { userId, protein: 130, recordedAt: new Date("2026-05-12T12:00:00.000Z") },
    { userId, protein: 130, recordedAt: new Date("2026-05-18T12:00:00.000Z") },
    { userId, protein: 90, recordedAt: new Date("2026-05-21T12:00:00.000Z") },
    { userId, protein: 90, recordedAt: new Date("2026-05-28T12:00:00.000Z") },
  );
}

function seedWorkoutLogs(userId = "user_1") {
  modelMocks.workoutLogs.push(
    { userId, recordedAt: new Date("2026-05-09T12:00:00.000Z"), countsAsResistance: true },
    { userId, recordedAt: new Date("2026-05-12T12:00:00.000Z"), countsAsResistance: true },
    { userId, recordedAt: new Date("2026-05-18T12:00:00.000Z"), countsAsResistance: true },
    { userId, recordedAt: new Date("2026-05-28T12:00:00.000Z"), countsAsResistance: true },
  );
}

function seedProtocol(userId = "user_1") {
  modelMocks.protocols.push({
    userId,
    medicationName: "Zepbound",
    shotDay: "monday",
    startDate: "2026-05-01",
    active: true,
  });
}

function seedRecentDoseLogs(userId = "user_1") {
  modelMocks.doseLogs.push(
    { userId, recordedAt: new Date("2026-05-25T08:00:00.000Z") },
    { userId, recordedAt: new Date("2026-06-01T08:00:00.000Z") },
  );
}

describe("stall diagnostic service", () => {
  beforeEach(() => {
    modelMocks.reset();
    coachMocks.generateStallDiagnostic.mockReset();
    coachMocks.loggerWarn.mockReset();
    coachMocks.generateStallDiagnostic.mockResolvedValue({
      explanation:
        "You are not failing, and the medication is still working. Your weight has been flat for 14 days because protein and training both slipped.",
      suggestedFix: "Hit 120 grams of protein daily and complete two resistance sessions this week.",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });
  });

  it("returns not stalled with no AI call when onboarding is incomplete", async () => {
    modelMocks.createUser("user_1", false, "active");

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.stalled).toBe(false);
    expect(result.explanation).toBeNull();
    expect(result.suggestedFix).toBeNull();
    expect(coachMocks.generateStallDiagnostic).not.toHaveBeenCalled();
  });

  it("rejects canceled users before computing the diagnostic", async () => {
    modelMocks.createUser("user_1", true, "canceled");

    await expect(getStallDiagnostic("user_1", NOW)).rejects.toMatchObject<AppError>({
      statusCode: 403,
    });

    expect(modelMocks.WeightLogModel.find).not.toHaveBeenCalled();
    expect(coachMocks.generateStallDiagnostic).not.toHaveBeenCalled();
  });

  it("returns not stalled when fewer than three weight logs exist in the past 30 days", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    modelMocks.weightLogs.push(
      { userId: "user_1", value: 184.2, unit: "lb", measuredAt: new Date("2026-05-18T12:00:00.000Z") },
      { userId: "user_1", value: 184.0, unit: "lb", measuredAt: new Date("2026-06-01T12:00:00.000Z") },
    );

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.stalled).toBe(false);
    expect(result.deterministicAnalysis.weightTrend.daysFlat).toBe(14);
    expect(coachMocks.generateStallDiagnostic).not.toHaveBeenCalled();
  });

  it("returns not stalled when weight changed by more than the stall threshold", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedHealthyLossWeights();
    seedTrendCheckins();

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.stalled).toBe(false);
    expect(result.daysSinceWeightChange).toBe(0);
    expect(result.deterministicAnalysis.weightTrend).toMatchObject({
      daysFlat: 0,
      startWeight: 184.8,
      endWeight: 184.0,
      unit: "lb",
    });
    expect(coachMocks.generateStallDiagnostic).not.toHaveBeenCalled();
  });

  it("calls AI and returns prose when the user is genuinely stalled", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result).toMatchObject({
      stalled: true,
      daysSinceWeightChange: 14,
      explanation:
        "You are not failing, and the medication is still working. Your weight has been flat for 14 days because protein and training both slipped.",
      suggestedFix: "Hit 120 grams of protein daily and complete two resistance sessions this week.",
      copyVersion: "v1.0-gpt-4o-mini",
      engineVersion: "v1.0",
    });
    expect(coachMocks.generateStallDiagnostic).toHaveBeenCalledTimes(1);
  });

  it("passes imperial weight values to the stall coach prompt for lb users", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();

    await getStallDiagnostic("user_1", NOW);

    const [analysis] = coachMocks.generateStallDiagnostic.mock.calls[0];
    expect(analysis.weightTrend).toMatchObject({
      startWeight: 184.2,
      endWeight: 184,
      unit: "lb",
    });
  });

  it("converts stall coach prompt weight values to kg for metric users", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1", {
      goalWeight: 75,
      goalWeightUnit: "kg",
    });
    seedStalledWeights();
    seedTrendCheckins();

    const result = await getStallDiagnostic("user_1", NOW);

    const [analysis] = coachMocks.generateStallDiagnostic.mock.calls[0];
    expect(analysis.weightTrend).toMatchObject({
      startWeight: 83.6,
      endWeight: 83.5,
      unit: "kg",
    });
    expect(result.deterministicAnalysis.weightTrend).toMatchObject({
      startWeight: 184.2,
      endWeight: 184,
      unit: "lb",
    });
  });

  it("defaults stall coach prompt weights to imperial when unit preference is missing", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1", {
      goalWeightUnit: undefined as unknown as WeightUnit,
    });
    seedStalledWeights();
    seedTrendCheckins();

    await getStallDiagnostic("user_1", NOW);

    const [analysis] = coachMocks.generateStallDiagnostic.mock.calls[0];
    expect(analysis.weightTrend).toMatchObject({
      startWeight: 184.2,
      endWeight: 184,
      unit: "lb",
    });
  });

  it("returns deterministic stalled analysis with null prose when AI fails", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    coachMocks.generateStallDiagnostic.mockRejectedValueOnce(new Error("OpenAI down"));

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.stalled).toBe(true);
    expect(result.explanation).toBeNull();
    expect(result.suggestedFix).toBeNull();
    expect(result.copyVersion).toBeNull();
    expect(coachMocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        category: undefined,
      }),
      "[diagnostics] stall coach content generation failed",
    );
  });

  it("returns deterministic stalled analysis with null prose when AI JSON parsing fails", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    coachMocks.generateStallDiagnostic.mockRejectedValueOnce(
      Object.assign(new Error("Malformed JSON"), { category: "parse_error" }),
    );

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.stalled).toBe(true);
    expect(result.explanation).toBeNull();
    expect(result.suggestedFix).toBeNull();
  });

  it("computes protein and training trend deltas across the recent and prior windows", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.deterministicAnalysis.proteinTrend).toEqual({
      recentAvgGrams: 95,
      priorAvgGrams: 125,
      deltaGrams: -30,
    });
    expect(result.deterministicAnalysis.trainingTrend).toEqual({
      recentSessionsCount: 2,
      recentSessionsTarget: 4,
      priorSessionsCount: 5,
      priorSessionsTarget: 4,
    });
    expect(result.deterministicAnalysis.doseTrend).toBeNull();
  });

  it("computes protein, training, and dose trends from daily logs when coverage exists", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    seedMealLogs();
    seedWorkoutLogs();
    seedProtocol();
    seedRecentDoseLogs();

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.deterministicAnalysis.proteinTrend).toEqual({
      recentAvgGrams: 90,
      priorAvgGrams: 130,
      deltaGrams: -40,
    });
    expect(result.deterministicAnalysis.trainingTrend).toEqual({
      recentSessionsCount: 1,
      recentSessionsTarget: 4,
      priorSessionsCount: 3,
      priorSessionsTarget: 4,
    });
    expect(result.deterministicAnalysis.doseTrend).toEqual({
      recentDoses: 2,
      missedDoses: 0,
    });
  });

  it("counts only workout logs marked as resistance in the training trend", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    modelMocks.workoutLogs.push(
      { userId: "user_1", recordedAt: new Date("2026-05-09T12:00:00.000Z"), countsAsResistance: true },
      { userId: "user_1", recordedAt: new Date("2026-05-12T12:00:00.000Z"), countsAsResistance: false },
      { userId: "user_1", recordedAt: new Date("2026-05-28T12:00:00.000Z"), countsAsResistance: true },
      { userId: "user_1", recordedAt: new Date("2026-05-29T12:00:00.000Z"), countsAsResistance: false },
    );

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.deterministicAnalysis.trainingTrend).toEqual({
      recentSessionsCount: 1,
      recentSessionsTarget: 4,
      priorSessionsCount: 1,
      priorSessionsTarget: 4,
    });
  });

  it("uses meal logs for protein while leaving doseTrend null when dose logs are absent", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    seedMealLogs();

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.deterministicAnalysis.proteinTrend).toEqual({
      recentAvgGrams: 90,
      priorAvgGrams: 130,
      deltaGrams: -40,
    });
    expect(result.deterministicAnalysis.trainingTrend).toEqual({
      recentSessionsCount: 2,
      recentSessionsTarget: 4,
      priorSessionsCount: 5,
      priorSessionsTarget: 4,
    });
    expect(result.deterministicAnalysis.doseTrend).toBeNull();
  });

  it("counts missed weekly doses from shotDay and startDate in the recent window", async () => {
    modelMocks.createUser("user_1");
    modelMocks.createProfile("user_1");
    seedStalledWeights();
    seedTrendCheckins();
    seedProtocol();
    modelMocks.doseLogs.push({ userId: "user_1", recordedAt: new Date("2026-06-01T08:00:00.000Z") });

    const result = await getStallDiagnostic("user_1", NOW);

    expect(result.deterministicAnalysis.doseTrend).toEqual({
      recentDoses: 1,
      missedDoses: 1,
    });
  });
});
