import type { WeightUnit } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

interface MockObjectId {
  toString: () => string;
}

interface MockWeightLogDocument {
  _id: MockObjectId;
  userId: string;
  weekOf?: string;
  value: number;
  unit: WeightUnit;
  measuredAt: Date;
  source: "weekly_checkin";
  weeklyCheckinId?: MockObjectId;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockWeightLogDocument>;
}

interface MockWeeklyCheckinDocument {
  _id: MockObjectId;
  userId: string;
  weekOf: string;
  weight: {
    value: number;
    unit: WeightUnit;
    measuredAt: string;
  };
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  sideEffects: string[];
  notes?: string;
  userContextSnapshot: ReturnType<typeof userContextSnapshot>;
  weightLogId: MockObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface MockWeeklyVerdictDocument {
  _id: MockObjectId;
  userId: string;
  weekOf: string;
  checkinId: MockObjectId | null;
  source: "checkin" | "cron_backfill" | "cron_no_data";
  engineVersion: string;
  copyVersion: string | null;
  explanation: string | null;
  status: "on_track" | "drifting" | "losing_muscle" | "no_data";
  score: number | null;
  estimatedLeanMassRisk: number | null;
  nextActionCode: string;
  headline: string;
  message: string;
  explanationFactors: string[];
  inputsUsed?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  let nextId = 1;
  const weightLogs: MockWeightLogDocument[] = [];
  const checkins: MockWeeklyCheckinDocument[] = [];
  const verdicts: MockWeeklyVerdictDocument[] = [];
  const mealLogs: Array<{ userId: string; protein: number; recordedAt: Date }> = [];
  const workoutLogs: Array<{ userId: string; recordedAt: Date }> = [];

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

  const WeightLogModel = {
    findOneAndUpdate: vi.fn(async (filter, update, _options) => {
      let weightLog = weightLogs.find((log) => {
        return log.userId === filter.userId && log.weekOf === filter.weekOf;
      });

      if (!weightLog) {
        weightLog = {
          _id: objectId("weight_log"),
          userId: filter.userId,
          weekOf: filter.weekOf,
          value: 0,
          unit: "lb",
          measuredAt: new Date("2026-06-01T12:00:00.000Z"),
          source: "weekly_checkin",
          ...timestamps(),
          save: async () => weightLog,
        };
        weightLogs.push(weightLog);
      }

      Object.assign(weightLog, update.$set);
      return weightLog;
    }),
  };

  const WeeklyCheckinModel = {
    findOneAndUpdate: vi.fn(async (filter, update, _options) => {
      let checkin = checkins.find((storedCheckin) => {
        return storedCheckin.userId === filter.userId && storedCheckin.weekOf === filter.weekOf;
      });

      if (!checkin) {
        checkin = {
          _id: objectId("checkin"),
          userId: filter.userId,
          weekOf: filter.weekOf,
          weight: update.$set.weight,
          proteinGramsPerDay: update.$set.proteinGramsPerDay,
          resistanceWorkoutsCompleted: update.$set.resistanceWorkoutsCompleted,
          sideEffects: update.$set.sideEffects,
          notes: update.$set.notes,
          userContextSnapshot: update.$set.userContextSnapshot,
          weightLogId: update.$set.weightLogId,
          ...timestamps(),
        };
        checkins.push(checkin);
      } else {
        Object.assign(checkin, update.$set);
      }

      return checkin;
    }),
  };

  const WeeklyVerdictModel = {
    findOneAndUpdate: vi.fn(async (filter, update, _options) => {
      let verdict = verdicts.find((storedVerdict) => {
        return storedVerdict.userId === filter.userId && storedVerdict.weekOf === filter.weekOf;
      });

      if (!verdict) {
        verdict = {
          _id: objectId("verdict"),
          ...update.$set,
          userId: filter.userId,
          weekOf: filter.weekOf,
          ...timestamps(),
        };
        verdicts.push(verdict);
      } else {
        Object.assign(verdict, update.$set);
      }

      return verdict;
    }),
  };

  const MealLogModel = {
    find: vi.fn((filter) => ({
      select: vi.fn(async () => {
        return mealLogs.filter((log) => {
          return (
            log.userId === filter.userId &&
            log.recordedAt >= filter.recordedAt.$gte &&
            log.recordedAt < filter.recordedAt.$lt
          );
        });
      }),
    })),
  };

  const WorkoutLogModel = {
    countDocuments: vi.fn(async (filter) => {
      return workoutLogs.filter((log) => {
        return (
          log.userId === filter.userId &&
          log.recordedAt >= filter.recordedAt.$gte &&
          log.recordedAt < filter.recordedAt.$lt
        );
      }).length;
    }),
  };

  return {
    weightLogs,
    mealLogs,
    workoutLogs,
    checkins,
    verdicts,
    WeightLogModel,
    WeeklyCheckinModel,
    WeeklyVerdictModel,
    MealLogModel,
    WorkoutLogModel,
    reset: () => {
      nextId = 1;
      weightLogs.splice(0, weightLogs.length);
      mealLogs.splice(0, mealLogs.length);
      workoutLogs.splice(0, workoutLogs.length);
      checkins.splice(0, checkins.length);
      verdicts.splice(0, verdicts.length);
      WeightLogModel.findOneAndUpdate.mockClear();
      WeeklyCheckinModel.findOneAndUpdate.mockClear();
      WeeklyVerdictModel.findOneAndUpdate.mockClear();
      MealLogModel.find.mockClear();
      WorkoutLogModel.countDocuments.mockClear();
    },
  };
});

const coachMocks = vi.hoisted(() => ({
  generateVerdictExplanation: vi.fn(),
}));

const muscleRetentionMocks = vi.hoisted(() => ({
  createOrUpdateSnapshotForWeek: vi.fn(),
}));

vi.mock("../models/weightLog.model", () => ({
  WeightLogModel: modelMocks.WeightLogModel,
}));

vi.mock("../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../models/weeklyVerdict.model", () => ({
  WeeklyVerdictModel: modelMocks.WeeklyVerdictModel,
}));

vi.mock("../models/mealLog.model", () => ({
  MealLogModel: modelMocks.MealLogModel,
}));

vi.mock("../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.WorkoutLogModel,
}));

vi.mock("../services/coachContent.service", async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    generateVerdictExplanation: coachMocks.generateVerdictExplanation,
  };
});

vi.mock("../services/muscleRetention.service", () => ({
  createOrUpdateSnapshotForWeek: muscleRetentionMocks.createOrUpdateSnapshotForWeek,
}));

import { createApp } from "../server";

function userContextSnapshot() {
  return {
    profile: {
      journeyStage: "active_loss" as const,
      goalWeight: 165,
      goalWeightUnit: "lb" as const,
      dailyProteinTarget: 120,
      dailyCalorieTarget: 1800,
      goalPace: "steady" as const,
      biggestFear: "losing_muscle" as const,
      trainingStatus: "beginner" as const,
      sideEffectBaseline: [],
      timezone: "America/New_York",
    },
    priorWeight: {
      value: 185,
      unit: "lb" as const,
      measuredAt: "2026-05-18T12:00:00.000Z",
    },
  };
}

function makeCheckin(overrides: { value?: number } = {}) {
  return {
    weekOf: "2026-05-25",
    weight: {
      value: overrides.value ?? 184,
      unit: "lb",
      measuredAt: "2026-05-26T12:00:00.000Z",
    },
    proteinGramsPerDay: 120,
    resistanceWorkoutsCompleted: 3,
    sideEffects: [],
    userContextSnapshot: userContextSnapshot(),
  };
}

describe("weekly check-in routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    modelMocks.reset();
    coachMocks.generateVerdictExplanation.mockReset();
    muscleRetentionMocks.createOrUpdateSnapshotForWeek.mockReset();
    coachMocks.generateVerdictExplanation.mockResolvedValue({
      explanation:
        "You are keeping your muscle this week. Protein was steady, training showed up, and the scale moved slowly enough to stay useful.",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });
    muscleRetentionMocks.createOrUpdateSnapshotForWeek.mockResolvedValue({});
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("keeps one weight log when the same check-in body is posted twice", async () => {
    const firstResponse = await request(app)
      .post("/weekly-checkins")
      .set("Authorization", authorization)
      .send(makeCheckin());
    const secondResponse = await request(app)
      .post("/weekly-checkins")
      .set("Authorization", authorization)
      .send(makeCheckin());

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.weightLogs[0]).toMatchObject({
      userId: "user_1",
      weekOf: "2026-05-25",
      value: 184,
    });
    expect(firstResponse.body.data.verdict).toMatchObject({
      explanation:
        "You are keeping your muscle this week. Protein was steady, training showed up, and the scale moved slowly enough to stay useful.",
      copyVersion: "v1.0-gpt-4o-mini",
    });
    expect(coachMocks.generateVerdictExplanation).toHaveBeenCalledTimes(2);
  });

  it("stores the latest weight when the same check-in is posted with a different weight", async () => {
    const firstResponse = await request(app)
      .post("/weekly-checkins")
      .set("Authorization", authorization)
      .send(makeCheckin({ value: 184 }));
    const secondResponse = await request(app)
      .post("/weekly-checkins")
      .set("Authorization", authorization)
      .send(makeCheckin({ value: 182 }));

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(modelMocks.weightLogs).toHaveLength(1);
    expect(modelMocks.weightLogs[0]).toMatchObject({
      userId: "user_1",
      weekOf: "2026-05-25",
      value: 182,
      unit: "lb",
    });
  });
});
