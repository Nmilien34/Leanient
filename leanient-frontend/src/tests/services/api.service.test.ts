import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import type { User } from "@leanient/shared";
import { createLeanientApiClient } from "../../services/api.service";
import { AUTH_STORAGE_KEYS } from "../../services/storage.service";
import { testStorage } from "../testStorage";

const user: User = {
  id: "user_1",
  emailVerified: true,
  onboardingComplete: false,
  authProviders: [],
  hasAvatar: false,
  subscriptionStatus: "free",
  subscriptionWillRenew: false,
  createdAt: "2026-05-29T12:00:00.000Z",
  updatedAt: "2026-05-29T12:00:00.000Z",
};

function okAdapter(data: unknown): AxiosAdapter {
  return async (config) => ({
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });
}

describe("api service", () => {
  beforeEach(() => {
    testStorage.clear();
  });

  it("unwraps backend data responses", async () => {
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: okAdapter({ data: user }),
    });

    await expect(api.getMe()).resolves.toEqual(user);
  });

  it("attaches the bearer token from storage", async () => {
    await testStorage.setItem(AUTH_STORAGE_KEYS.token, "session-token");
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seenConfig = config;
        return {
          data: { data: user },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await api.getMe();

    expect(seenConfig?.headers.Authorization).toBe("Bearer session-token");
  });

  it("posts Apple link requests to the authenticated link endpoint", async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const linkedUser: User = {
      ...user,
      authProviders: [
        {
          provider: "google",
          providerUserId: "google_1",
          linkedAt: "2026-06-01T12:00:00.000Z",
        },
        {
          provider: "apple",
          providerUserId: "apple_1",
          linkedAt: "2026-06-10T12:00:00.000Z",
        },
      ],
    };
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seenConfig = config;
        return {
          data: { data: linkedUser },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await expect(
      api.linkAppleProvider({
        identityToken: "apple.identity.token",
        fullName: { givenName: "Maya" },
      }),
    ).resolves.toEqual(linkedUser);

    expect(seenConfig?.method).toBe("post");
    expect(seenConfig?.url).toBe("/auth/apple/link");
    expect(JSON.parse(String(seenConfig?.data))).toEqual({
      identityToken: "apple.identity.token",
      fullName: { givenName: "Maya" },
    });
  });

  it("prevents conditional cache revalidation on API requests", async () => {
    let seenConfig: InternalAxiosRequestConfig | undefined;
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seenConfig = config;
        return {
          data: { data: user },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await api.getMe();

    expect(seenConfig?.headers["Cache-Control"]).toBe("no-store");
    expect(seenConfig?.headers.Pragma).toBe("no-cache");
    expect(seenConfig?.headers["If-None-Match"]).toBeUndefined();
    expect(seenConfig?.headers["If-Modified-Since"]).toBeUndefined();
  });

  it("clears auth storage when the backend returns 401", async () => {
    await testStorage.setItem(AUTH_STORAGE_KEYS.token, "session-token");
    await testStorage.setItem(AUTH_STORAGE_KEYS.user, "{}");
    const onUnauthorized = vi.fn();
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      onUnauthorized,
      adapter: async (config) => {
        const error = new Error("Unauthorized") as Error & {
          response: { status: number };
          config: InternalAxiosRequestConfig;
        };
        error.response = { status: 401 };
        error.config = config;
        throw error;
      },
    });

    await expect(api.getMe()).rejects.toThrow("Unauthorized");

    expect(testStorage.snapshot()).toEqual({});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("calls the Tier 2 read endpoints with schema-parsed responses", async () => {
    const seen: Array<{ url?: string; method?: string; params?: unknown }> = [];
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seen.push({ url: config.url, method: config.method, params: config.params });
        const now = "2026-06-04T12:00:00.000Z";
        const responses: Record<string, unknown> = {
          "/home/focus": {
            category: "protein_gap",
            headline: "30g protein at lunch",
            suggestion: "Add Greek yogurt and protein powder.",
            actionType: "log_meal",
            actionLabel: "Log this meal",
            selectionReason: "protein is behind",
            engineVersion: "v1.0",
            generatedAt: now,
          },
          "/progress/overview": {
            chart: {
              snapshots: [],
              currentLabel: "maintaining",
              currentScore: 0,
            },
            summary: {
              weeksOnProtocol: 1,
              medicationName: "Wegovy",
              startingWeight: 198,
              currentWeight: 198,
              totalWeightLoss: 0,
              targetWeight: 172,
              remainingToTarget: 26,
            },
            engineVersion: "v1.0",
          },
          "/training/today": {
            sessionsThisWeek: 1,
            weeklyTarget: 3,
            shotDayContext: {
              isOnProtocol: true,
              shotDayLabel: "SHOT DAY +2",
              daysUntilNextDose: 5,
            },
            featuredWorkout: null,
            recommendationEngineVersion: "v1.0",
          },
          "/meal-logs": [
            {
              id: "meal_1",
              userId: "user_1",
              recordedAt: now,
              deletedAt: null,
              source: "manual",
              foodName: "Greek yogurt",
              protein: 20,
              calories: 150,
              createdAt: now,
              updatedAt: now,
            },
          ],
          "/workout-logs": [
            {
              id: "workout_log_1",
              userId: "user_1",
              recordedAt: now,
              deletedAt: null,
              workoutId: "workout_1",
              exercises: [],
              durationMinutes: 22,
              countsAsResistance: true,
              createdAt: now,
              updatedAt: now,
            },
          ],
          "/dose-logs": [
            {
              id: "dose_log_1",
              userId: "user_1",
              recordedAt: now,
              deletedAt: null,
              medicationProtocolId: "protocol_1",
              doseAmount: 1,
              doseUnit: "mg",
              injectionSite: "abdomen_left",
              createdAt: now,
              updatedAt: now,
            },
          ],
        };

        return {
          data: { data: responses[String(config.url)] },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await expect(api.getTodaysFocus()).resolves.toMatchObject({ category: "protein_gap" });
    await expect(api.getProgressOverview()).resolves.toMatchObject({
      summary: { targetWeight: 172 },
    });
    await expect(api.getTrainingToday()).resolves.toMatchObject({ sessionsThisWeek: 1 });
    await expect(
      api.getMealLogs({ recordedAt: "2026-06-04T15:30:00.000Z" }),
    ).resolves.toHaveLength(1);
    await expect(
      api.getWorkoutLogs({ recordedAt: "2026-06-04T15:30:00.000Z" }),
    ).resolves.toHaveLength(1);
    await expect(
      api.getDoseLogs({ recordedAt: "2026-06-04T15:30:00.000Z" }),
    ).resolves.toHaveLength(1);

    expect(seen).toEqual([
      { url: "/home/focus", method: "get", params: undefined },
      { url: "/progress/overview", method: "get", params: undefined },
      { url: "/training/today", method: "get", params: undefined },
      {
        url: "/meal-logs",
        method: "get",
        params: {
          from: "2026-06-04T00:00:00.000Z",
          to: "2026-06-05T00:00:00.000Z",
        },
      },
      {
        url: "/workout-logs",
        method: "get",
        params: {
          from: "2026-06-04T00:00:00.000Z",
          to: "2026-06-05T00:00:00.000Z",
        },
      },
      {
        url: "/dose-logs",
        method: "get",
        params: {
          from: "2026-06-04T00:00:00.000Z",
          to: "2026-06-05T00:00:00.000Z",
        },
      },
    ]);
  });

  it("calls Tier 2 log creation endpoints with schema-validated bodies", async () => {
    const seen: Array<{ url?: string; method?: string; data?: unknown }> = [];
    const now = "2026-06-04T12:00:00.000Z";
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seen.push({ url: config.url, method: config.method, data: config.data });
        const responses: Record<string, unknown> = {
          "/meal-logs": {
            id: "meal_1",
            userId: "user_1",
            recordedAt: now,
            deletedAt: null,
            source: "manual",
            foodName: "Greek yogurt",
            protein: 20,
            calories: 150,
            createdAt: now,
            updatedAt: now,
          },
          "/workout-logs": {
            id: "workout_log_1",
            userId: "user_1",
            recordedAt: now,
            deletedAt: null,
            customWorkoutName: "Resistance",
            exercises: [],
            durationMinutes: 22,
            countsAsResistance: true,
            createdAt: now,
            updatedAt: now,
          },
          "/dose-logs": {
            id: "dose_1",
            userId: "user_1",
            recordedAt: now,
            deletedAt: null,
            medicationProtocolId: "protocol_1",
            doseAmount: 0.5,
            doseUnit: "mg",
            createdAt: now,
            updatedAt: now,
          },
          "/measurement-logs": {
            id: "measurement_1",
            userId: "user_1",
            recordedAt: now,
            deletedAt: null,
            measurements: { waist: 34 },
            unit: "in",
            createdAt: now,
            updatedAt: now,
          },
          "/side-effect-logs": {
            id: "side_1",
            userId: "user_1",
            recordedAt: now,
            deletedAt: null,
            symptom: "nausea",
            severity: 2,
            createdAt: now,
            updatedAt: now,
          },
        };
        return {
          data: { data: responses[String(config.url)] },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await api.createMealLog({
      recordedAt: now,
      source: "manual",
      foodName: "Greek yogurt",
      protein: 20,
      calories: 150,
    });
    await api.createWorkoutLog({
      recordedAt: now,
      customWorkoutName: "Resistance",
      exercises: [],
      durationMinutes: 22,
      countsAsResistance: true,
    });
    await api.createDoseLog({
      recordedAt: now,
      medicationProtocolId: "protocol_1",
      doseAmount: 0.5,
      doseUnit: "mg",
    });
    await api.createMeasurementLog({
      recordedAt: now,
      measurements: { waist: 34 },
      unit: "in",
    });
    await api.createSideEffectLog({
      recordedAt: now,
      symptom: "nausea",
      severity: 2,
    });

    expect(seen.map((call) => [call.method, call.url])).toEqual([
      ["post", "/meal-logs"],
      ["post", "/workout-logs"],
      ["post", "/dose-logs"],
      ["post", "/measurement-logs"],
      ["post", "/side-effect-logs"],
    ]);
  });

  it("posts meal scans and stall diagnostics to the backend trigger endpoints", async () => {
    const seen: Array<{ url?: string; method?: string; data?: unknown }> = [];
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => {
        seen.push({ url: config.url, method: config.method, data: config.data });
        const responses: Record<string, unknown> = {
          "/meal-scans/analyze": {
            scanId: "scan_1",
            photoS3Key: "meal-scans/user_1/scan.jpg",
            analysis: {
              foodName: "Chicken bowl",
              servingSize: "1 bowl",
              protein: 35,
              calories: 520,
              carbs: 45,
              fat: 18,
              confidence: 0.86,
            },
            coachContent: null,
            visionEngineVersion: "v1.0",
          },
          "/diagnostics/stall": {
            stalled: false,
            daysSinceWeightChange: 0,
            deterministicAnalysis: {
              weightTrend: {
                daysFlat: 0,
                startWeight: 198,
                endWeight: 196,
                unit: "lb",
              },
              proteinTrend: {
                recentAvgGrams: 120,
                priorAvgGrams: 110,
                deltaGrams: 10,
              },
              trainingTrend: {
                recentSessionsCount: 3,
                recentSessionsTarget: 3,
                priorSessionsCount: 2,
                priorSessionsTarget: 3,
              },
              doseTrend: null,
            },
            explanation: null,
            suggestedFix: null,
            engineVersion: "v1.0",
            copyVersion: null,
          },
        };
        return {
          data: { data: responses[String(config.url)] },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });

    await api.scanMeal({
      imageData: "Zm9v",
      imageMimeType: "image/jpeg",
    });
    await api.getStallDiagnostic();

    expect(seen.map((call) => [call.method, call.url])).toEqual([
      ["post", "/meal-scans/analyze"],
      ["post", "/diagnostics/stall"],
    ]);
  });

  it("parses a successful weekly check-in response into the returned verdict", async () => {
    const now = "2026-06-07T04:17:04.995Z";
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => ({
        data: {
          data: {
            checkin: {
              id: "checkin_1",
              userId: "user_1",
              weekOf: "2026-06-01",
              weight: { value: 184, unit: "lb", measuredAt: now },
              proteinGramsPerDay: 120,
              resistanceWorkoutsCompleted: 2,
              sideEffects: [],
              notes: "Feeling steady",
              userContextSnapshot: {
                profile: {
                  journeyStage: "active_loss",
                  goalWeight: 172,
                  goalWeightUnit: "lb",
                  dailyProteinTarget: 144,
                  dailyCalorieTarget: 2080,
                  goalPace: "steady",
                  biggestFear: "losing_muscle",
                  trainingStatus: "consistent",
                  equipmentAccess: "dumbbells",
                  weeklyWorkoutTarget: 3,
                  sideEffectBaseline: [],
                  timezone: "America/New_York",
                },
                medicationProtocol: {
                  medicationCatalogId: "catalog_1",
                  medicationName: "Mounjaro",
                  doseAmount: 2.5,
                  doseUnit: "mg",
                  shotDays: ["sunday"],
                  startDate: "2026-06-01",
                },
                priorWeight: { value: 186, unit: "lb", measuredAt: "2026-06-01T12:00:00.000Z" },
              },
              weightLogId: "weight_1",
              createdAt: now,
              updatedAt: now,
            },
            verdict: {
              id: "verdict_1",
              userId: "user_1",
              weekOf: "2026-06-01",
              checkinId: "checkin_1",
              source: "checkin",
              engineVersion: "leanient-verdict-2026-05-29",
              copyVersion: "v1.0-gpt-4o-mini",
              explanation: "You are keeping your muscle this week. Keep the same rhythm.",
              status: "on_track",
              score: 88,
              estimatedLeanMassRisk: 0.12,
              nextActionCode: "keep_rhythm",
              headline: "Keep your rhythm",
              message: "Protein and training gave this week a strong signal.",
              explanationFactors: ["Protein intake supported lean-mass retention."],
              inputsUsed: {
                profile: {
                  journeyStage: "active_loss",
                  goalWeight: 172,
                  goalWeightUnit: "lb",
                  dailyProteinTarget: 144,
                  dailyCalorieTarget: 2080,
                  goalPace: "steady",
                  biggestFear: "losing_muscle",
                  trainingStatus: "consistent",
                  equipmentAccess: "dumbbells",
                  weeklyWorkoutTarget: 3,
                  sideEffectBaseline: [],
                  timezone: "America/New_York",
                },
                medicationProtocol: {
                  medicationCatalogId: "catalog_1",
                  medicationName: "Mounjaro",
                  doseAmount: 2.5,
                  doseUnit: "mg",
                  shotDays: ["sunday"],
                  startDate: "2026-06-01",
                },
                priorWeight: { value: 186, unit: "lb", measuredAt: "2026-06-01T12:00:00.000Z" },
                weight: { value: 184, unit: "lb", measuredAt: now },
                proteinGramsPerDay: 120,
                resistanceWorkoutsCompleted: 2,
                dataSource: {
                  protein: "logs",
                  training: "logs",
                },
              },
              createdAt: now,
              updatedAt: now,
            },
          },
        },
        status: 201,
        statusText: "Created",
        headers: {},
        config,
      }),
    });

    await expect(
      api.submitWeeklyCheckin({
        weekOf: "2026-06-01",
        weight: { value: 184, unit: "lb", measuredAt: now },
        proteinGramsPerDay: 120,
        resistanceWorkoutsCompleted: 2,
        sideEffects: [],
        notes: "Feeling steady",
      }),
    ).resolves.toMatchObject({
      id: "verdict_1",
      status: "on_track",
      inputsUsed: {
        profile: {
          equipmentAccess: "dumbbells",
          weeklyWorkoutTarget: 3,
          timezone: "America/New_York",
        },
      },
    });
  });

  it("does not fail a saved weekly check-in when the verdict snapshot has extra nested fields", async () => {
    const now = "2026-06-07T04:17:04.995Z";
    const api = createLeanientApiClient({
      baseURL: "http://localhost:8080",
      adapter: async (config) => ({
        data: {
          data: {
            checkin: {
              id: "checkin_1",
              userId: "user_1",
              weekOf: "2026-06-01",
              weight: { value: 184, unit: "lb", measuredAt: now },
              proteinGramsPerDay: 120,
              resistanceWorkoutsCompleted: 2,
              sideEffects: [],
              userContextSnapshot: {
                profile: {
                  journeyStage: "active_loss",
                  goalWeight: 172,
                  goalWeightUnit: "lb",
                  dailyProteinTarget: 144,
                  dailyCalorieTarget: 2080,
                  goalPace: "steady",
                  biggestFear: "losing_muscle",
                  trainingStatus: "consistent",
                  equipmentAccess: "dumbbells",
                  weeklyWorkoutTarget: 3,
                  sideEffectBaseline: [],
                  timezone: "America/New_York",
                },
              },
              weightLogId: "weight_1",
              createdAt: now,
              updatedAt: now,
            },
            verdict: {
              id: "verdict_1",
              userId: "user_1",
              weekOf: "2026-06-01",
              checkinId: "checkin_1",
              source: "checkin",
              engineVersion: "leanient-verdict-2026-05-29",
              copyVersion: null,
              explanation: null,
              status: "on_track",
              score: 88,
              estimatedLeanMassRisk: 0.12,
              nextActionCode: "keep_rhythm",
              headline: "Keep your rhythm",
              message: "Protein and training gave this week a strong signal.",
              explanationFactors: ["Protein intake supported lean-mass retention."],
              inputsUsed: {
                profile: {
                  journeyStage: "active_loss",
                  goalWeight: 172,
                  goalWeightUnit: "lb",
                  dailyProteinTarget: 144,
                  dailyCalorieTarget: 2080,
                  goalPace: "steady",
                  biggestFear: "losing_muscle",
                  trainingStatus: "consistent",
                  equipmentAccess: "dumbbells",
                  weeklyWorkoutTarget: 3,
                  sideEffectBaseline: [],
                  timezone: "America/New_York",
                  sex: "male",
                },
                weight: { value: 184, unit: "lb", measuredAt: now },
                proteinGramsPerDay: 120,
                resistanceWorkoutsCompleted: 2,
              },
              createdAt: now,
              updatedAt: now,
            },
          },
        },
        status: 201,
        statusText: "Created",
        headers: {},
        config,
      }),
    });

    await expect(
      api.submitWeeklyCheckin({
        weekOf: "2026-06-01",
        weight: { value: 184, unit: "lb", measuredAt: now },
        proteinGramsPerDay: 120,
        resistanceWorkoutsCompleted: 2,
        sideEffects: [],
      }),
    ).resolves.toMatchObject({
      id: "verdict_1",
      status: "on_track",
      headline: "Keep your rhythm",
    });
  });
});
