import { beforeEach, describe, expect, it, vi } from "vitest";

type RetentionLabel = "keeping_muscle" | "maintaining" | "losing_some" | "losing_muscle";

interface MockWeightLog {
  userId: string;
  weekOf?: string;
  value: number;
  unit: "lb" | "kg";
  measuredAt: Date;
  source: "onboarding" | "weekly_checkin" | "manual";
}

interface MockCheckin {
  userId: string;
  weekOf: string;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  weight: {
    value: number;
    unit: "lb" | "kg";
    measuredAt: string;
  };
}

interface MockSnapshot {
  _id: {
    toString: () => string;
  };
  userId: string;
  weekOf: Date;
  proteinScore: number;
  trainingScore: number;
  paceScore: number;
  muscleRetentionScore: number;
  retentionLabel: RetentionLabel;
  weeklyWeightLossLb: number;
  cumulativeWeightLossLb: number;
  inputsUsed: {
    avgDailyProteinGrams: number;
    sessionsCompleted: number;
    weeklyWorkoutTarget: number;
    dailyProteinTarget: number;
    startWeight: number;
    endWeight: number;
    dataSource: {
      protein: "logs" | "checkin_fallback";
      training: "logs" | "checkin_fallback";
      weight: "logs" | "checkin_fallback";
    };
  };
  engineVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  const snapshots: MockSnapshot[] = [];
  const weightLogs: MockWeightLog[] = [];
  const checkins: MockCheckin[] = [];
  const protocols: Array<{ userId: string; startDate: string; medicationName: string; active: boolean }> =
    [];
  const profile = {
    userId: "user_1",
    goalWeight: 165,
    dailyProteinTarget: 120,
    weeklyWorkoutTarget: 3,
  };
  const resolvedInputs = {
    proteinGramsPerDay: 120,
    resistanceWorkoutsCompleted: 3,
    dataSource: {
      protein: "logs" as const,
      training: "logs" as const,
    },
  };
  const user = {
    _id: {
      toString: () => "user_1",
    },
    onboardingComplete: true,
  };

  function matchesWeek(date: Date, weekOf: Date) {
    return date.toISOString().slice(0, 10) === weekOf.toISOString().slice(0, 10);
  }

  const getUserProfileDocument = vi.fn(async () => profile);
  const resolveWeeklyVerdictInputs = vi.fn(async () => resolvedInputs);
  const UserModel = {
    findById: vi.fn(async (userId: string) => {
      return user._id.toString() === userId ? user : null;
    }),
  };

  const MuscleRetentionSnapshotModel = {
    findOneAndUpdate: vi.fn(async (filter, update) => {
      const weekOf = new Date(filter.weekOf);
      let snapshot = snapshots.find(
        (stored) => stored.userId === filter.userId && matchesWeek(stored.weekOf, weekOf),
      );

      if (!snapshot) {
        snapshot = {
          _id: {
            toString: () => `snapshot_${snapshots.length + 1}`,
          },
          userId: filter.userId,
          weekOf,
          ...update.$set,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        };
        snapshots.push(snapshot);
      } else {
        Object.assign(snapshot, update.$set, {
          updatedAt: new Date("2026-06-02T00:00:00.000Z"),
        });
      }

      return snapshot;
    }),
    find: vi.fn((filter: { userId: string }) => ({
      sort: vi.fn(() => ({
        limit: vi.fn(async (limit: number) =>
          snapshots
            .filter((snapshot) => snapshot.userId === filter.userId)
            .sort((left, right) => right.weekOf.getTime() - left.weekOf.getTime())
            .slice(0, limit),
        ),
      })),
    })),
    countDocuments: vi.fn(async (filter: { userId: string }) => {
      return snapshots.filter((snapshot) => snapshot.userId === filter.userId).length;
    }),
  };

  function sortWeightLogs(logs: MockWeightLog[], direction: 1 | -1) {
    return [...logs].sort(
      (left, right) => (left.measuredAt.getTime() - right.measuredAt.getTime()) * direction,
    );
  }

  const WeightLogModel = {
    findOne: vi.fn((filter: { userId: string; source?: string | { $ne?: string }; weekOf?: string; measuredAt?: unknown }) => ({
      sort: vi.fn(async (sort: { measuredAt?: 1 | -1 }) => {
        const direction = sort.measuredAt ?? 1;
        const logs = weightLogs.filter((log) => {
          const measuredAtFilter = filter.measuredAt as
            | { $lt?: Date; $lte?: Date; $gte?: Date }
            | undefined;
          const sourceMatches =
            !filter.source ||
            (typeof filter.source === "string"
              ? log.source === filter.source
              : filter.source.$ne
                ? log.source !== filter.source.$ne
                : true);
          return (
            log.userId === filter.userId &&
            sourceMatches &&
            (!filter.weekOf || log.weekOf === filter.weekOf) &&
            (!measuredAtFilter?.$lt || log.measuredAt < measuredAtFilter.$lt) &&
            (!measuredAtFilter?.$lte || log.measuredAt <= measuredAtFilter.$lte) &&
            (!measuredAtFilter?.$gte || log.measuredAt >= measuredAtFilter.$gte)
          );
        });
        return sortWeightLogs(logs, direction)[0] ?? null;
      }),
    })),
  };

  const WeeklyCheckinModel = {
    findOne: vi.fn(async (filter: { userId: string; weekOf: string }) => {
      return (
        checkins.find((checkin) => checkin.userId === filter.userId && checkin.weekOf === filter.weekOf) ??
        null
      );
    }),
    find: vi.fn((filter: { userId: string }) => ({
      sort: vi.fn(async () =>
        checkins
          .filter((checkin) => checkin.userId === filter.userId)
          .sort((left, right) => left.weekOf.localeCompare(right.weekOf)),
      ),
    })),
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
    getUserProfileDocument,
    MuscleRetentionSnapshotModel,
    profile,
    protocols,
    resolveWeeklyVerdictInputs,
    resolvedInputs,
    snapshots,
    user,
    UserModel,
    WeightLogModel,
    weightLogs,
    WeeklyCheckinModel,
    UserMedicationProtocolModel,
    reset: () => {
      snapshots.splice(0, snapshots.length);
      weightLogs.splice(0, weightLogs.length);
      checkins.splice(0, checkins.length);
      protocols.splice(0, protocols.length);
      Object.assign(profile, {
        userId: "user_1",
        goalWeight: 165,
        dailyProteinTarget: 120,
        weeklyWorkoutTarget: 3,
      });
      Object.assign(user, {
        _id: {
          toString: () => "user_1",
        },
        onboardingComplete: true,
      });
      Object.assign(resolvedInputs, {
        proteinGramsPerDay: 120,
        resistanceWorkoutsCompleted: 3,
        dataSource: {
          protein: "logs" as const,
          training: "logs" as const,
        },
      });
      getUserProfileDocument.mockClear();
      resolveWeeklyVerdictInputs.mockClear();
      UserModel.findById.mockClear();
      MuscleRetentionSnapshotModel.findOneAndUpdate.mockClear();
      MuscleRetentionSnapshotModel.find.mockClear();
      MuscleRetentionSnapshotModel.countDocuments.mockClear();
      WeightLogModel.findOne.mockClear();
      WeeklyCheckinModel.findOne.mockClear();
      WeeklyCheckinModel.find.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
    },
  };
});

vi.mock("../../services/userProfile.service", () => ({
  getUserProfileDocument: modelMocks.getUserProfileDocument,
}));

vi.mock("../../services/verdict.service", () => ({
  resolveWeeklyVerdictInputs: modelMocks.resolveWeeklyVerdictInputs,
}));

vi.mock("../../models/muscleRetentionSnapshot.model", () => ({
  MuscleRetentionSnapshotModel: modelMocks.MuscleRetentionSnapshotModel,
}));

vi.mock("../../models/weightLog.model", () => ({
  WeightLogModel: modelMocks.WeightLogModel,
}));

vi.mock("../../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

import {
  backfillSnapshotsForUser,
  createOrUpdateSnapshotForWeek,
  getChartData,
  getProgressOverview,
} from "../../services/muscleRetention.service";

function seedWeights() {
  modelMocks.weightLogs.push(
    {
      userId: "user_1",
      value: 184,
      unit: "lb",
      measuredAt: new Date("2026-05-01T12:00:00.000Z"),
      source: "onboarding",
    },
    {
      userId: "user_1",
      weekOf: "2026-05-25",
      value: 181,
      unit: "lb",
      measuredAt: new Date("2026-05-24T12:00:00.000Z"),
      source: "weekly_checkin",
    },
    {
      userId: "user_1",
      weekOf: "2026-06-01",
      value: 180,
      unit: "lb",
      measuredAt: new Date("2026-06-01T12:00:00.000Z"),
      source: "weekly_checkin",
    },
  );
}

function seedCheckin(weekOf = "2026-06-01") {
  modelMocks.checkins.push({
    userId: "user_1",
    weekOf,
    proteinGramsPerDay: 90,
    resistanceWorkoutsCompleted: 1,
    weight: {
      value: 180,
      unit: "lb",
      measuredAt: `${weekOf}T12:00:00.000Z`,
    },
  });
}

describe("muscle retention service", () => {
  beforeEach(() => {
    modelMocks.reset();
    seedWeights();
    seedCheckin();
  });

  it("creates a weekly snapshot from resolved verdict inputs", async () => {
    const snapshot = await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(snapshot).toMatchObject({
      userId: "user_1",
      proteinScore: 100,
      trainingScore: 100,
      paceScore: 90,
      retentionLabel: "keeping_muscle",
      weeklyWeightLossLb: 1,
      cumulativeWeightLossLb: 4,
      engineVersion: "v1.0",
      inputsUsed: {
        avgDailyProteinGrams: 120,
        sessionsCompleted: 3,
        weeklyWorkoutTarget: 3,
        dailyProteinTarget: 120,
        startWeight: 181,
        endWeight: 180,
        dataSource: {
          protein: "logs",
          training: "logs",
          weight: "logs",
        },
      },
    });
    expect(modelMocks.resolveWeeklyVerdictInputs).toHaveBeenCalledWith({
      userId: "user_1",
      weekOf: "2026-06-01",
      proteinGramsPerDay: 90,
      resistanceWorkoutsCompleted: 1,
    });
  });

  it("upserts idempotently for the same user and week", async () => {
    await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));
    modelMocks.resolvedInputs.proteinGramsPerDay = 60;

    const updated = await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(modelMocks.snapshots).toHaveLength(1);
    expect(updated.inputsUsed.avgDailyProteinGrams).toBe(60);
  });

  it("creates a snapshot with check-in fallback data sources when logs are absent", async () => {
    Object.assign(modelMocks.resolvedInputs, {
      proteinGramsPerDay: 90,
      resistanceWorkoutsCompleted: 1,
      dataSource: {
        protein: "checkin_fallback" as const,
        training: "checkin_fallback" as const,
      },
    });

    const snapshot = await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));

    expect(snapshot.inputsUsed.dataSource).toEqual({
      protein: "checkin_fallback",
      training: "checkin_fallback",
      weight: "logs",
    });
    expect(snapshot.inputsUsed.avgDailyProteinGrams).toBe(90);
    expect(snapshot.inputsUsed.sessionsCompleted).toBe(1);
  });

  it("creates a losing-muscle snapshot when the week has no behavior data", async () => {
    modelMocks.checkins.splice(0, modelMocks.checkins.length);
    Object.assign(modelMocks.resolvedInputs, {
      proteinGramsPerDay: 0,
      resistanceWorkoutsCompleted: 0,
      dataSource: {
        protein: "checkin_fallback" as const,
        training: "checkin_fallback" as const,
      },
    });

    const snapshot = await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-08T00:00:00.000Z"));

    expect(snapshot.retentionLabel).toBe("losing_muscle");
    expect(snapshot.inputsUsed.avgDailyProteinGrams).toBe(0);
    expect(snapshot.inputsUsed.sessionsCompleted).toBe(0);
    expect(snapshot.cumulativeWeightLossLb).toBe(4);
  });

  it("returns ordered chart data and computes weeks on protocol", async () => {
    await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));
    await createOrUpdateSnapshotForWeek("user_1", new Date("2026-05-25T00:00:00.000Z"));
    modelMocks.protocols.push({
      userId: "user_1",
      startDate: "2026-05-20",
      medicationName: "Wegovy",
      active: true,
    });

    const chartData = await getChartData("user_1", 12, new Date("2026-06-10T00:00:00.000Z"));

    expect(chartData.snapshots.map((snapshot) => snapshot.weekOf.toISOString().slice(0, 10))).toEqual([
      "2026-05-25",
      "2026-06-01",
    ]);
    expect(chartData.weeksOnProtocol).toBe(3);
    expect(chartData.startingWeight).toBe(184);
    expect(chartData.currentWeight).toBe(180);
    expect(chartData.totalWeightLoss).toBe(4);
    expect(chartData.currentLabel).toBe("keeping_muscle");
  });

  it("triggers lazy backfill when chart data has fewer snapshots than check-in history", async () => {
    modelMocks.checkins.push({
      ...modelMocks.checkins[0],
      weekOf: "2026-05-25",
    });

    const chartData = await getChartData("user_1", 12, new Date("2026-06-10T00:00:00.000Z"));

    expect(chartData.snapshots).toHaveLength(2);
    expect(modelMocks.MuscleRetentionSnapshotModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it("does not backfill when snapshot count already covers check-in history", async () => {
    await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));
    modelMocks.MuscleRetentionSnapshotModel.findOneAndUpdate.mockClear();

    await getChartData("user_1", 12, new Date("2026-06-10T00:00:00.000Z"));

    expect(modelMocks.MuscleRetentionSnapshotModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("backfills one snapshot per historical check-in and is idempotent", async () => {
    modelMocks.checkins.splice(0, modelMocks.checkins.length);
    for (let index = 0; index < 8; index += 1) {
      const date = new Date("2026-04-06T00:00:00.000Z");
      date.setUTCDate(date.getUTCDate() + index * 7);
      seedCheckin(date.toISOString().slice(0, 10));
    }

    const firstCount = await backfillSnapshotsForUser("user_1");
    const secondCount = await backfillSnapshotsForUser("user_1");

    expect(firstCount).toBe(8);
    expect(secondCount).toBe(8);
    expect(modelMocks.snapshots).toHaveLength(8);
  });

  it("backfills from non-onboarding weight logs when no check-ins exist", async () => {
    modelMocks.checkins.splice(0, modelMocks.checkins.length);
    modelMocks.weightLogs.splice(0, modelMocks.weightLogs.length);
    modelMocks.weightLogs.push(
      {
        userId: "user_1",
        value: 184,
        unit: "lb",
        measuredAt: new Date("2026-05-01T12:00:00.000Z"),
        source: "onboarding",
      },
      {
        userId: "user_1",
        value: 182,
        unit: "lb",
        measuredAt: new Date("2026-05-26T12:00:00.000Z"),
        source: "manual",
      },
    );

    const count = await backfillSnapshotsForUser("user_1", new Date("2026-06-03T00:00:00.000Z"));

    expect(count).toBe(2);
    expect(modelMocks.snapshots.map((snapshot) => snapshot.weekOf.toISOString().slice(0, 10))).toEqual([
      "2026-05-25",
      "2026-06-01",
    ]);
  });

  it("assembles the progress overview with goalWeight exposed as targetWeight", async () => {
    await createOrUpdateSnapshotForWeek("user_1", new Date("2026-06-01T00:00:00.000Z"));
    modelMocks.protocols.push({
      userId: "user_1",
      startDate: "2026-05-20",
      medicationName: "Wegovy",
      active: true,
    });

    const overview = await getProgressOverview("user_1", 12, new Date("2026-06-10T00:00:00.000Z"));

    expect(overview.chart.currentScore).toBe(98.5);
    expect(overview.summary).toMatchObject({
      medicationName: "Wegovy",
      startingWeight: 184,
      currentWeight: 180,
      totalWeightLoss: 4,
      targetWeight: 165,
      remainingToTarget: 15,
    });
  });

  it("rejects progress overview for users who have not completed onboarding", async () => {
    modelMocks.user.onboardingComplete = false;

    await expect(getProgressOverview("user_1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
