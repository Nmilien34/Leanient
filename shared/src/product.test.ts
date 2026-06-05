import { describe, expect, it } from "vitest";
import {
  computeWeeklyWorkoutTarget,
  FOCUS_CATEGORIES,
  inferEquipmentAccessFromTrainingStatus,
  MUSCLE_RETENTION_LABELS,
  onboardingCompleteResponseSchema,
  progressOverviewResponseSchema,
  progressPhotoResponseSchema,
  SUBSCRIPTION_STATUSES,
  TODAYS_FOCUS_ACTION_TYPES,
  todaysFocusResponseSchema,
  userResponseSchema,
  VERDICT_STATUSES,
  weeklyCheckinRequestSchema,
} from "./index";

describe("product foundation contracts", () => {
  it("locks verdict statuses used by backend and frontend", () => {
    expect(VERDICT_STATUSES).toEqual(["on_track", "drifting", "losing_muscle", "no_data"]);
  });

  it("locks subscription statuses used by RevenueCat mapping", () => {
    expect(SUBSCRIPTION_STATUSES).toEqual([
      "free",
      "trialing",
      "active",
      "active_canceled",
      "past_due",
      "canceled",
      "refunded",
    ]);
  });

  it("computes onboarding training defaults from training status", () => {
    expect(computeWeeklyWorkoutTarget("not_training")).toBe(2);
    expect(computeWeeklyWorkoutTarget("beginner")).toBe(2);
    expect(computeWeeklyWorkoutTarget("consistent")).toBe(3);
    expect(computeWeeklyWorkoutTarget("returning")).toBe(3);
    expect(inferEquipmentAccessFromTrainingStatus("not_training")).toBe("bodyweight_only");
    expect(inferEquipmentAccessFromTrainingStatus("consistent")).toBe("dumbbells");
    expect(inferEquipmentAccessFromTrainingStatus("returning")).toBe("full_gym");
  });

  it("accepts a progress overview response with muscle retention snapshots", () => {
    expect(MUSCLE_RETENTION_LABELS).toEqual([
      "keeping_muscle",
      "maintaining",
      "losing_some",
      "losing_muscle",
    ]);

    const parsed = progressOverviewResponseSchema.parse({
      chart: {
        snapshots: [
          {
            id: "snapshot_1",
            userId: "user_1",
            weekOf: "2026-06-01T00:00:00.000Z",
            proteinScore: 100,
            trainingScore: 67,
            paceScore: 90,
            muscleRetentionScore: 87,
            retentionLabel: "keeping_muscle",
            weeklyWeightLossLb: 1,
            cumulativeWeightLossLb: 4,
            inputsUsed: {
              avgDailyProteinGrams: 120,
              sessionsCompleted: 2,
              weeklyWorkoutTarget: 3,
              dailyProteinTarget: 120,
              startWeight: 181,
              endWeight: 180,
              dataSource: {
                protein: "logs",
                training: "checkin_fallback",
                weight: "logs",
              },
            },
            engineVersion: "v1.0",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        currentLabel: "keeping_muscle",
        currentScore: 87,
      },
      summary: {
        weeksOnProtocol: 6,
        medicationName: "Wegovy",
        startingWeight: 184,
        currentWeight: 180,
        totalWeightLoss: 4,
        targetWeight: 165,
        remainingToTarget: 15,
      },
      engineVersion: "v1.0",
    });

    expect(parsed.summary.targetWeight).toBe(165);
  });

  it("accepts a today's focus response with nullable AI copy fields", () => {
    expect(FOCUS_CATEGORIES).toEqual([
      "onboarding_nudge",
      "shot_day_recovery",
      "training_gap",
      "protein_gap",
      "steady_state",
    ]);
    expect(TODAYS_FOCUS_ACTION_TYPES).toContain("log_meal");

    const parsed = todaysFocusResponseSchema.parse({
      category: "protein_gap",
      headline: null,
      suggestion: null,
      actionType: "none",
      actionLabel: null,
      selectionReason: "protein is behind target today",
      engineVersion: "v1.0",
      generatedAt: "2026-06-04T12:00:00.000Z",
    });

    expect(parsed.category).toBe("protein_gap");
  });

  it("accepts progress photo list items with signed view URLs", () => {
    const parsed = progressPhotoResponseSchema.parse({
      id: "photo_1",
      userId: "user_1",
      captureDate: "2026-06-01",
      s3Key: "users/user_1/progress-photos/photo_1.jpg",
      contentType: "image/jpeg",
      status: "uploaded",
      viewUrl: "https://photos.example.com/photo_1.jpg",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(parsed.viewUrl).toBe("https://photos.example.com/photo_1.jpg");
  });

  it("requires onboardingComplete on user responses", () => {
    const parsed = userResponseSchema.parse({
      id: "user_1",
      emailVerified: true,
      onboardingComplete: false,
      authProviders: [],
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
      createdAt: "2026-05-29T12:00:00.000Z",
      updatedAt: "2026-05-29T12:00:00.000Z",
    });

    expect(parsed.onboardingComplete).toBe(false);
    expect(() =>
      userResponseSchema.parse({
        id: "user_1",
        emailVerified: true,
        authProviders: [],
        subscriptionStatus: "free",
        subscriptionWillRenew: false,
        createdAt: "2026-05-29T12:00:00.000Z",
        updatedAt: "2026-05-29T12:00:00.000Z",
      }),
    ).toThrow();
  });

  it("requires the completed user in onboarding responses", () => {
    const parsed = onboardingCompleteResponseSchema.parse({
      user: {
        id: "user_1",
        emailVerified: true,
        onboardingComplete: true,
        authProviders: [],
        subscriptionStatus: "free",
        subscriptionWillRenew: false,
        createdAt: "2026-05-29T12:00:00.000Z",
        updatedAt: "2026-06-02T15:00:00.000Z",
      },
      profile: {
        id: "profile_1",
        userId: "user_1",
        journeyStage: "active_loss",
        goalWeight: 165,
        goalWeightUnit: "lb",
        dailyProteinTarget: 144,
        dailyCalorieTarget: 1850,
        goalPace: "steady",
        biggestFear: "losing_muscle",
        trainingStatus: "consistent",
        equipmentAccess: "dumbbells",
        weeklyWorkoutTarget: 3,
        sideEffectBaseline: [],
        timezone: "America/New_York",
        nutritionEngineVersion: "v1.0",
        createdAt: "2026-06-02T15:00:00.000Z",
        updatedAt: "2026-06-02T15:00:00.000Z",
      },
      medicationProtocol: {
        id: "protocol_1",
        userId: "user_1",
        medicationName: "Wegovy",
        doseUnit: "mg",
        shotDay: "monday",
        startDate: "2026-05-01",
        active: true,
        createdAt: "2026-06-02T15:00:00.000Z",
        updatedAt: "2026-06-02T15:00:00.000Z",
      },
      weightLog: {
        id: "weight_1",
        userId: "user_1",
        value: 184,
        unit: "lb",
        measuredAt: "2026-06-02T12:00:00.000Z",
        source: "onboarding",
        createdAt: "2026-06-02T15:00:00.000Z",
        updatedAt: "2026-06-02T15:00:00.000Z",
      },
    });

    expect(parsed.user.onboardingComplete).toBe(true);
    expect(() =>
      onboardingCompleteResponseSchema.parse({
        profile: parsed.profile,
        medicationProtocol: parsed.medicationProtocol,
        weightLog: parsed.weightLog,
      }),
    ).toThrow();
  });

  it("accepts a weekly check-in with replayable health context", () => {
    const parsed = weeklyCheckinRequestSchema.parse({
      weekOf: "2026-05-25",
      weight: {
        value: 184,
        unit: "lb",
        measuredAt: "2026-05-29T12:00:00.000Z",
      },
      proteinGramsPerDay: 125,
      resistanceWorkoutsCompleted: 3,
      sideEffects: ["nausea"],
      notes: "Energy came back after shot day.",
      userContextSnapshot: {
        profile: {
          journeyStage: "active_loss",
          goalWeight: 165,
          goalWeightUnit: "lb",
          dailyProteinTarget: 120,
          dailyCalorieTarget: 1800,
          goalPace: "steady",
          biggestFear: "losing_muscle",
          trainingStatus: "beginner",
          sideEffectBaseline: ["nausea"],
          timezone: "America/New_York",
        },
        medicationProtocol: {
          medicationCatalogId: "zepbound",
          medicationName: "Zepbound",
          doseAmount: 5,
          doseUnit: "mg",
          shotDay: "monday",
          startDate: "2026-04-01",
        },
        priorWeight: {
          value: 186,
          unit: "lb",
          measuredAt: "2026-05-22T12:00:00.000Z",
        },
      },
    });

    expect(parsed.userContextSnapshot.profile.goalPace).toBe("steady");
  });
});
