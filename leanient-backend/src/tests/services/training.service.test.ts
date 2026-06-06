import { ERROR_CODES, type TrainingTodayResponse, type Workout } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppError } from "../../lib/errors";
import type * as CoachContentService from "../../services/coachContent.service";
import type * as WorkoutRecommendationService from "../../services/workoutRecommendation.service";

const modelMocks = vi.hoisted(() => {
  const UserModel = {
    findById: vi.fn(),
  };
  const getUserProfileDocument = vi.fn();
  const UserMedicationProtocolModel = {
    findOne: vi.fn(),
  };
  const DoseLogModel = {
    find: vi.fn(() => ({
      sort: vi.fn(async () => []),
    })),
  };
  const WeeklyCheckinModel = {
    findOne: vi.fn(() => ({
      sort: vi.fn(async () => null),
    })),
  };
  const WorkoutLogModel = {
    find: vi.fn(async () => []),
    countDocuments: vi.fn(async () => 0),
  };
  const recommendFeaturedWorkout = vi.fn();
  const generateWorkoutRecommendationCopy = vi.fn();

  return {
    UserModel,
    getUserProfileDocument,
    UserMedicationProtocolModel,
    DoseLogModel,
    WeeklyCheckinModel,
    WorkoutLogModel,
    recommendFeaturedWorkout,
    generateWorkoutRecommendationCopy,
    reset: () => {
      UserModel.findById.mockReset();
      getUserProfileDocument.mockReset();
      UserMedicationProtocolModel.findOne.mockReset();
      DoseLogModel.find.mockReset();
      WeeklyCheckinModel.findOne.mockReset();
      WorkoutLogModel.find.mockReset();
      WorkoutLogModel.countDocuments.mockReset();
      recommendFeaturedWorkout.mockReset();
      generateWorkoutRecommendationCopy.mockReset();
    },
  };
});

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../../services/userProfile.service", () => ({
  getUserProfileDocument: modelMocks.getUserProfileDocument,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
  resolveShotDays: (protocol: { shotDays?: string[]; shotDay?: string }) => {
    if (Array.isArray(protocol.shotDays) && protocol.shotDays.length > 0) {
      return protocol.shotDays;
    }
    return protocol.shotDay ? [protocol.shotDay] : [];
  },
}));

vi.mock("../../models/doseLog.model", () => ({
  DoseLogModel: modelMocks.DoseLogModel,
}));

vi.mock("../../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.WorkoutLogModel,
}));

vi.mock("../../services/workoutRecommendation.service", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof WorkoutRecommendationService;
  return {
    ...actual,
    recommendFeaturedWorkout: modelMocks.recommendFeaturedWorkout,
  };
});

vi.mock("../../services/coachContent.service", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof CoachContentService;
  return {
    ...actual,
    generateWorkoutRecommendationCopy: modelMocks.generateWorkoutRecommendationCopy,
  };
});

import { getTrainingToday } from "../../services/training.service";
import { WorkoutRecommendationError } from "../../services/workoutRecommendation.service";

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "workout_upper-body-dumbbell",
    slug: "upper-body-dumbbell",
    title: "Upper body strength",
    shortDescription: "Dumbbell push and pull focus",
    focus: "strength",
    energyPhase: "steady_energy",
    durationMinutes: 22,
    difficulty: "beginner",
    equipment: "dumbbells",
    intensity: "moderate",
    muscleGroups: ["chest", "back", "arms"],
    category: "strength",
    exercises: [
      {
        name: "Dumbbell bench press",
        sets: 3,
        reps: "8-10",
        restSeconds: 90,
        muscleGroups: ["chest", "triceps"],
        notes: null,
      },
    ],
    safetyNotes: [],
    tags: [],
    version: 1,
    active: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function seedHappyPath() {
  modelMocks.UserModel.findById.mockResolvedValue({
    _id: { toString: () => "user_1" },
    onboardingComplete: true,
  });
  modelMocks.getUserProfileDocument.mockResolvedValue({
    userId: "user_1",
    equipmentAccess: "dumbbells",
    weeklyWorkoutTarget: 3,
    biggestFear: "losing_muscle",
    trainingStatus: "consistent",
    sideEffectBaseline: [],
  });
  modelMocks.UserMedicationProtocolModel.findOne.mockResolvedValue({
    userId: "user_1",
    active: true,
    medicationName: "Zepbound",
    doseUnit: "mg",
    shotDays: ["monday"],
    startDate: "2026-06-01",
  });
  modelMocks.DoseLogModel.find.mockReturnValue({
    sort: vi.fn(async () => [
      {
        id: "dose_1",
        userId: "user_1",
        recordedAt: "2026-06-02T12:00:00.000Z",
        medicationProtocolId: "protocol_1",
        doseAmount: 5,
        doseUnit: "mg",
        deletedAt: null,
        createdAt: "2026-06-02T12:00:00.000Z",
        updatedAt: "2026-06-02T12:00:00.000Z",
      },
    ]),
  });
  modelMocks.WeeklyCheckinModel.findOne.mockReturnValue({
    sort: vi.fn(async () => ({
      sideEffects: ["feel_fine"],
    })),
  });
  modelMocks.WorkoutLogModel.find.mockResolvedValue([
    {
      workoutId: { toString: () => "workout_lower-body-strength" },
      recordedAt: new Date("2026-06-02T16:00:00.000Z"),
      deletedAt: null,
    },
  ]);
  modelMocks.WorkoutLogModel.countDocuments.mockResolvedValue(1);
  modelMocks.recommendFeaturedWorkout.mockResolvedValue({
    workout: workout(),
    selectionReason: "strength_rotation",
  });
  modelMocks.generateWorkoutRecommendationCopy.mockResolvedValue({
    copy: "Energy's good today. Dumbbells only.",
    copyVersion: "v1.0-gpt-4o-mini",
    model: "gpt-4o-mini",
  });
}

describe("training service", () => {
  beforeEach(() => {
    modelMocks.reset();
    seedHappyPath();
  });

  it("returns the full Train-tab composite response", async () => {
    const result = await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(result).toMatchObject<TrainingTodayResponse>({
      sessionsThisWeek: 1,
      weeklyTarget: 3,
      shotDayContext: {
        isOnProtocol: true,
        shotDayLabel: "SHOT DAY +1",
        daysUntilNextDose: 6,
      },
      featuredWorkout: {
        workout: workout(),
        selectionReason: "strength_rotation",
        coachCopy: "Energy's good today. Dumbbells only.",
        coachCopyVersion: "v1.0-gpt-4o-mini",
      },
      recommendationEngineVersion: "v1.0",
    });
    expect(modelMocks.recommendFeaturedWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        energy: "good",
        sessionsThisWeek: 1,
        weeklyTarget: 3,
      }),
    );
  });

  it("returns an inactive shot-day context when the user has no active protocol", async () => {
    modelMocks.UserMedicationProtocolModel.findOne.mockResolvedValueOnce(null);

    const result = await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(result.shotDayContext).toEqual({
      isOnProtocol: false,
      shotDayLabel: null,
      daysUntilNextDose: null,
    });
    expect(result.featuredWorkout?.workout.slug).toBe("upper-body-dumbbell");
  });

  it("passes mid energy when there is no recent check-in or baseline signal", async () => {
    modelMocks.WeeklyCheckinModel.findOne.mockReturnValueOnce({
      sort: vi.fn(async () => null),
    });

    await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(modelMocks.recommendFeaturedWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ energy: "mid" }),
    );
  });

  it("falls back to profile side-effect baseline for energy when there is no recent check-in", async () => {
    modelMocks.WeeklyCheckinModel.findOne.mockReturnValueOnce({
      sort: vi.fn(async () => null),
    });
    modelMocks.getUserProfileDocument.mockResolvedValueOnce({
      userId: "user_1",
      equipmentAccess: "dumbbells",
      weeklyWorkoutTarget: 3,
      biggestFear: "losing_muscle",
      trainingStatus: "consistent",
      sideEffectBaseline: ["low_energy"],
    });

    await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(modelMocks.recommendFeaturedWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ energy: "low" }),
    );
  });

  it("gracefully returns null coach copy when OpenAI fails", async () => {
    modelMocks.generateWorkoutRecommendationCopy.mockRejectedValueOnce(new Error("OpenAI down"));

    const result = await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(result.featuredWorkout).toMatchObject({
      coachCopy: null,
      coachCopyVersion: null,
    });
  });

  it("returns null featured workout when no workout matches", async () => {
    modelMocks.recommendFeaturedWorkout.mockRejectedValueOnce(
      new WorkoutRecommendationError("No workouts match"),
    );

    const result = await getTrainingToday("user_1", new Date("2026-06-03T12:00:00.000Z"));

    expect(result.featuredWorkout).toBeNull();
    expect(result.sessionsThisWeek).toBe(1);
  });

  it("rejects users who have not completed onboarding", async () => {
    modelMocks.UserModel.findById.mockResolvedValueOnce({
      _id: { toString: () => "user_1" },
      onboardingComplete: false,
    });

    await expect(getTrainingToday("user_1")).rejects.toMatchObject<AppError>({
      statusCode: 403,
      code: ERROR_CODES.badRequest,
    });
  });
});
