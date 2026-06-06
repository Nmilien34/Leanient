import type { CalculateWeeklyVerdictInput } from "../../services/verdict.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  generateVerdictExplanation: vi.fn(),
  loggerWarn: vi.fn(),
}));

const modelMocks = vi.hoisted(() => {
  const mealLogs: Array<{ userId: string; protein: number; recordedAt: Date }> = [];
  const workoutLogs: Array<{ userId: string; recordedAt: Date; countsAsResistance?: boolean }> = [];

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
          (filter.countsAsResistance === undefined ||
            log.countsAsResistance === filter.countsAsResistance) &&
          log.recordedAt >= filter.recordedAt.$gte &&
          log.recordedAt < filter.recordedAt.$lt
        );
      }).length;
    }),
  };

  return {
    mealLogs,
    workoutLogs,
    MealLogModel,
    WorkoutLogModel,
    reset: () => {
      mealLogs.splice(0, mealLogs.length);
      workoutLogs.splice(0, workoutLogs.length);
      MealLogModel.find.mockClear();
      WorkoutLogModel.countDocuments.mockClear();
    },
  };
});

vi.mock("../../services/coachContent.service", async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    generateVerdictExplanation: serviceMocks.generateVerdictExplanation,
    VERDICT_EXPLANATION_COPY_VERSION: "v1.0-gpt-4o-mini",
  };
});

vi.mock("../../lib/logger", () => ({
  logger: {
    warn: serviceMocks.loggerWarn,
  },
}));

vi.mock("../../models/mealLog.model", () => ({
  MealLogModel: modelMocks.MealLogModel,
}));

vi.mock("../../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.WorkoutLogModel,
}));

import {
  calculateWeeklyVerdict,
  calculateWeeklyVerdictWithExplanation,
  createNoDataVerdict,
  resolveWeeklyVerdictInputs,
} from "../../services/verdict.service";

function makeVerdictInput(overrides: Partial<CalculateWeeklyVerdictInput> = {}) {
  return {
    userId: "user_1",
    checkinId: "checkin_1",
    weekOf: "2026-05-25",
    weight: { value: 184, unit: "lb" as const, measuredAt: "2026-05-29T12:00:00.000Z" },
    proteinGramsPerDay: 135,
    resistanceWorkoutsCompleted: 3,
    userContextSnapshot: {
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
      priorWeight: { value: 185, unit: "lb" as const, measuredAt: "2026-05-22T12:00:00.000Z" },
    },
    ...overrides,
  };
}

describe("verdict service", () => {
  beforeEach(() => {
    serviceMocks.generateVerdictExplanation.mockReset();
    serviceMocks.loggerWarn.mockReset();
    modelMocks.reset();
  });

  it("returns on_track when weight loss is modest and habits protect lean mass", () => {
    const verdict = calculateWeeklyVerdict(makeVerdictInput());

    expect(verdict.status).toBe("on_track");
    expect(verdict.score).toBeGreaterThanOrEqual(80);
    expect(verdict.nextActionCode).toBe("keep_rhythm");
  });

  it("returns losing_muscle when pace is aggressive and protective habits are missing", () => {
    const verdict = calculateWeeklyVerdict({
      userId: "user_1",
      checkinId: "checkin_1",
      weekOf: "2026-05-25",
      weight: { value: 181, unit: "lb", measuredAt: "2026-05-29T12:00:00.000Z" },
      proteinGramsPerDay: 55,
      resistanceWorkoutsCompleted: 0,
      userContextSnapshot: {
        profile: {
          journeyStage: "active_loss",
          goalWeight: 165,
          goalWeightUnit: "lb",
          dailyProteinTarget: 120,
          dailyCalorieTarget: 1800,
          goalPace: "aggressive",
          biggestFear: "losing_muscle",
          trainingStatus: "not_training",
          sideEffectBaseline: ["fatigue"],
          timezone: "America/New_York",
        },
        priorWeight: { value: 186, unit: "lb", measuredAt: "2026-05-22T12:00:00.000Z" },
      },
    });

    expect(verdict.status).toBe("losing_muscle");
    expect(verdict.nextActionCode).toBe("add_resistance_training");
  });

  it("creates the explicit no_data verdict for missed check-in weeks", () => {
    const verdict = createNoDataVerdict({
      userId: "user_1",
      weekOf: "2026-05-18",
      timezone: "America/New_York",
    });

    expect(verdict).toMatchObject({
      status: "no_data",
      source: "cron_no_data",
      score: null,
      checkinId: null,
      nextActionCode: "complete_checkin",
      explanation: null,
      copyVersion: null,
    });
  });

  it("stores replayable inputs with the computed verdict draft", () => {
    const verdict = calculateWeeklyVerdict({
      userId: "user_1",
      checkinId: "checkin_1",
      weekOf: "2026-05-25",
      weight: { value: 184, unit: "lb", measuredAt: "2026-05-29T12:00:00.000Z" },
      proteinGramsPerDay: 110,
      resistanceWorkoutsCompleted: 2,
      userContextSnapshot: {
        profile: {
          journeyStage: "active_loss",
          goalWeight: 165,
          goalWeightUnit: "lb",
          dailyProteinTarget: 120,
          dailyCalorieTarget: 1800,
          goalPace: "steady",
          biggestFear: "ozempic_face",
          trainingStatus: "returning",
          sideEffectBaseline: ["fatigue"],
          timezone: "America/New_York",
        },
        medicationProtocol: {
          medicationCatalogId: "tirzepatide",
          medicationName: "Zepbound",
          doseAmount: 5,
          doseUnit: "mg",
          shotDays: ["monday"],
          startDate: "2026-04-01",
        },
        priorWeight: { value: 186, unit: "lb", measuredAt: "2026-05-22T12:00:00.000Z" },
      },
    });

    expect(verdict.inputsUsed).toMatchObject({
      profile: {
        goalWeight: 165,
        biggestFear: "ozempic_face",
        trainingStatus: "returning",
      },
      medicationProtocol: {
        medicationName: "Zepbound",
        doseAmount: 5,
      },
      proteinGramsPerDay: 110,
      resistanceWorkoutsCompleted: 2,
      dataSource: {
        protein: "checkin_fallback",
        training: "checkin_fallback",
      },
    });
  });

  it("resolves verdict inputs from full meal and workout log coverage", async () => {
    modelMocks.mealLogs.push(
      { userId: "user_1", protein: 60, recordedAt: new Date("2026-05-25T12:00:00.000Z") },
      { userId: "user_1", protein: 40, recordedAt: new Date("2026-05-25T18:00:00.000Z") },
      { userId: "user_1", protein: 120, recordedAt: new Date("2026-05-27T12:00:00.000Z") },
    );
    modelMocks.workoutLogs.push(
      {
        userId: "user_1",
        recordedAt: new Date("2026-05-26T12:00:00.000Z"),
        countsAsResistance: true,
      },
      {
        userId: "user_1",
        recordedAt: new Date("2026-05-29T12:00:00.000Z"),
        countsAsResistance: true,
      },
    );

    const inputs = await resolveWeeklyVerdictInputs({
      userId: "user_1",
      weekOf: "2026-05-25",
      proteinGramsPerDay: 75,
      resistanceWorkoutsCompleted: 0,
    });

    expect(inputs).toEqual({
      proteinGramsPerDay: 110,
      resistanceWorkoutsCompleted: 2,
      dataSource: {
        protein: "logs",
        training: "logs",
      },
    });
  });

  it("counts only workout logs marked as resistance for verdict training inputs", async () => {
    modelMocks.workoutLogs.push(
      {
        userId: "user_1",
        recordedAt: new Date("2026-05-26T12:00:00.000Z"),
        countsAsResistance: true,
      },
      {
        userId: "user_1",
        recordedAt: new Date("2026-05-29T12:00:00.000Z"),
        countsAsResistance: false,
      },
    );

    const inputs = await resolveWeeklyVerdictInputs({
      userId: "user_1",
      weekOf: "2026-05-25",
      proteinGramsPerDay: 75,
      resistanceWorkoutsCompleted: 3,
    });

    expect(inputs).toMatchObject({
      resistanceWorkoutsCompleted: 1,
      dataSource: {
        training: "logs",
      },
    });
  });

  it("falls back to weekly check-in values when no logs exist", async () => {
    const inputs = await resolveWeeklyVerdictInputs({
      userId: "user_1",
      weekOf: "2026-05-25",
      proteinGramsPerDay: 120,
      resistanceWorkoutsCompleted: 3,
    });

    expect(inputs).toEqual({
      proteinGramsPerDay: 120,
      resistanceWorkoutsCompleted: 3,
      dataSource: {
        protein: "checkin_fallback",
        training: "checkin_fallback",
      },
    });
  });

  it("uses mixed data sources when one factor has logs and the other falls back", async () => {
    modelMocks.mealLogs.push({
      userId: "user_1",
      protein: 130,
      recordedAt: new Date("2026-05-27T12:00:00.000Z"),
    });

    const inputs = await resolveWeeklyVerdictInputs({
      userId: "user_1",
      weekOf: "2026-05-25",
      proteinGramsPerDay: 90,
      resistanceWorkoutsCompleted: 2,
    });

    expect(inputs).toEqual({
      proteinGramsPerDay: 130,
      resistanceWorkoutsCompleted: 2,
      dataSource: {
        protein: "logs",
        training: "checkin_fallback",
      },
    });
  });

  it("averages protein over days with meal logs, not all seven days", async () => {
    modelMocks.mealLogs.push(
      { userId: "user_1", protein: 30, recordedAt: new Date("2026-05-25T12:00:00.000Z") },
      { userId: "user_1", protein: 50, recordedAt: new Date("2026-05-25T18:00:00.000Z") },
      { userId: "user_1", protein: 160, recordedAt: new Date("2026-05-28T12:00:00.000Z") },
    );

    const inputs = await resolveWeeklyVerdictInputs({
      userId: "user_1",
      weekOf: "2026-05-25",
      proteinGramsPerDay: 90,
      resistanceWorkoutsCompleted: 1,
    });

    expect(inputs.proteinGramsPerDay).toBe(120);
    expect(inputs.dataSource.protein).toBe("logs");
  });

  it("persists AI explanation metadata when coach generation succeeds", async () => {
    serviceMocks.generateVerdictExplanation.mockResolvedValueOnce({
      explanation:
        "You are keeping your muscle this week. Protein was steady, training showed up, and the scale moved slowly enough to stay useful.",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });

    const verdict = await calculateWeeklyVerdictWithExplanation(makeVerdictInput());

    expect(serviceMocks.generateVerdictExplanation).toHaveBeenCalledTimes(1);
    expect(verdict.explanation).toContain("You are keeping your muscle");
    expect(verdict.copyVersion).toBe("v1.0-gpt-4o-mini");
  });

  it("passes imperial weight values to the verdict coach prompt for lb users", async () => {
    serviceMocks.generateVerdictExplanation.mockResolvedValueOnce({
      explanation: "Imperial explanation",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });

    await calculateWeeklyVerdictWithExplanation(makeVerdictInput());

    const [coachDraft, coachContext] = serviceMocks.generateVerdictExplanation.mock.calls[0];
    expect(coachDraft.inputsUsed?.weight).toMatchObject({ value: 184, unit: "lb" });
    expect(coachDraft.inputsUsed?.priorWeight).toMatchObject({ value: 185, unit: "lb" });
    expect(coachContext.priorWeight).toMatchObject({ value: 185, unit: "lb" });
  });

  it("converts verdict coach prompt weight values to kg for metric users", async () => {
    serviceMocks.generateVerdictExplanation.mockResolvedValueOnce({
      explanation: "Metric explanation",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });

    await calculateWeeklyVerdictWithExplanation(
      makeVerdictInput({
        weight: { value: 184, unit: "lb", measuredAt: "2026-05-29T12:00:00.000Z" },
        userContextSnapshot: {
          profile: {
            journeyStage: "active_loss",
            goalWeight: 75,
            goalWeightUnit: "kg",
            dailyProteinTarget: 120,
            dailyCalorieTarget: 1800,
            goalPace: "steady",
            biggestFear: "losing_muscle",
            trainingStatus: "beginner",
            sideEffectBaseline: [],
            timezone: "America/New_York",
          },
          priorWeight: {
            value: 185,
            unit: "lb",
            measuredAt: "2026-05-22T12:00:00.000Z",
          },
        },
      }),
    );

    const [coachDraft, coachContext] = serviceMocks.generateVerdictExplanation.mock.calls[0];
    expect(coachDraft.inputsUsed?.weight).toMatchObject({ value: 83.5, unit: "kg" });
    expect(coachDraft.inputsUsed?.priorWeight).toMatchObject({ value: 83.9, unit: "kg" });
    expect(coachContext.priorWeight).toMatchObject({ value: 83.9, unit: "kg" });
    expect(coachContext.profile.goalWeightUnit).toBe("kg");
  });

  it("defaults verdict coach prompt weights to imperial when unit preference is missing", async () => {
    serviceMocks.generateVerdictExplanation.mockResolvedValueOnce({
      explanation: "Default explanation",
      copyVersion: "v1.0-gpt-4o-mini",
      model: "gpt-4o-mini",
    });

    const input = makeVerdictInput();
    input.userContextSnapshot.profile.goalWeightUnit = undefined as unknown as "lb";

    await calculateWeeklyVerdictWithExplanation(input);

    const [coachDraft, coachContext] = serviceMocks.generateVerdictExplanation.mock.calls[0];
    expect(coachDraft.inputsUsed?.weight).toMatchObject({ value: 184, unit: "lb" });
    expect(coachContext.profile.goalWeightUnit).toBe("lb");
  });

  it("keeps the deterministic verdict when coach generation fails", async () => {
    serviceMocks.generateVerdictExplanation.mockRejectedValueOnce(new Error("OpenAI unavailable"));

    const verdict = await calculateWeeklyVerdictWithExplanation(makeVerdictInput());

    expect(verdict.status).toBe("on_track");
    expect(verdict.explanation).toBeNull();
    expect(verdict.copyVersion).toBeNull();
    expect(serviceMocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        weekOf: "2026-05-25",
        status: "on_track",
      }),
      "[verdict] coach explanation generation failed",
    );
  });

  it("treats coach generation timeouts as non-blocking verdict decoration failures", async () => {
    serviceMocks.generateVerdictExplanation.mockRejectedValueOnce(
      Object.assign(new Error("OpenAI request timed out"), { category: "timeout" }),
    );

    const verdict = await calculateWeeklyVerdictWithExplanation(makeVerdictInput());

    expect(verdict.status).toBe("on_track");
    expect(verdict.explanation).toBeNull();
    expect(verdict.copyVersion).toBeNull();
    expect(serviceMocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "timeout",
      }),
      "[verdict] coach explanation generation failed",
    );
  });
});
