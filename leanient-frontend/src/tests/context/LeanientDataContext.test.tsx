import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import {
  LeanientDataProvider,
  useLeanientData,
  type LeanientDataContextValue,
} from "../../context/LeanientDataContext";

async function renderDataHarness(api: LeanientDataContextValue["api"]) {
  let current: LeanientDataContextValue | undefined;

  function Harness() {
    current = useLeanientData();
    return null;
  }

  await act(async () => {
    TestRenderer.create(
      <LeanientDataProvider api={api} isAuthenticated>
        <Harness />
      </LeanientDataProvider>,
    );
  });

  return {
    value: () => {
      if (!current) {
        throw new Error("Leanient data context did not render");
      }
      return current;
    },
  };
}

function createMockApi(
  overrides: Partial<LeanientDataContextValue["api"]> = {},
): LeanientDataContextValue["api"] {
  return {
    getProfile: vi.fn().mockResolvedValue({ id: "profile_1" }),
    getMedicationProtocol: vi.fn().mockResolvedValue({ id: "protocol_1" }),
    getMedicationCatalog: vi.fn().mockResolvedValue([{ id: "med_1" }]),
    getWeightLogs: vi.fn().mockResolvedValue([{ id: "weight_1" }]),
    getLatestWeeklyVerdict: vi.fn().mockResolvedValue({
      status: "available",
      verdict: { id: "verdict_1", status: "on_track" },
      message: null,
    }),
    getWorkouts: vi.fn().mockResolvedValue([{ id: "workout_1" }]),
    getRecommendedWorkouts: vi.fn().mockResolvedValue([{ id: "workout_2" }]),
    getProgressPhotos: vi.fn().mockResolvedValue([{ id: "photo_1" }]),
    getTodaysFocus: vi.fn().mockResolvedValue({ category: "protein_gap" }),
    getProgressOverview: vi.fn().mockResolvedValue({ summary: { targetWeight: 172 } }),
    getTrainingToday: vi.fn().mockResolvedValue({ sessionsThisWeek: 1 }),
    getMealLogs: vi.fn().mockResolvedValue([{ id: "meal_1" }]),
    getWorkoutLogs: vi.fn().mockResolvedValue([{ id: "workout_log_1" }]),
    getDoseLogs: vi.fn().mockResolvedValue([{ id: "dose_log_1" }]),
    createWeightLog: vi.fn(),
    createMealLog: vi.fn(),
    createWorkoutLog: vi.fn(),
    createDoseLog: vi.fn(),
    createMeasurementLog: vi.fn(),
    createSideEffectLog: vi.fn(),
    createProgressPhotoUploadIntent: vi.fn(),
    confirmProgressPhotoUpload: vi.fn(),
    ...overrides,
  } as LeanientDataContextValue["api"];
}

describe("LeanientDataContext", () => {
  it("refreshes home and onboarding data from API methods", async () => {
    const api = createMockApi();
    const harness = await renderDataHarness(api);

    await act(async () => {
      await harness.value().refreshHomeData();
      await harness.value().refreshOnboardingData();
    });

    expect(harness.value().latestVerdict).toMatchObject({ id: "verdict_1" });
    expect(harness.value().latestVerdictStatus).toBe("available");
    expect(harness.value().latestVerdictMessage).toBeNull();
    expect(harness.value().profile).toMatchObject({ id: "profile_1" });
    expect(harness.value().medicationCatalog).toHaveLength(1);
    expect(harness.value().weightLogs).toHaveLength(1);
    expect(harness.value().todaysFocus).toMatchObject({ category: "protein_gap" });
    expect(harness.value().todaysMeals).toHaveLength(1);
    expect(harness.value().todaysWorkouts).toHaveLength(1);
    expect(harness.value().recentDoseLogs).toHaveLength(1);
    expect(harness.value().progressOverview).toMatchObject({ summary: { targetWeight: 172 } });
    expect(harness.value().trainingToday).toMatchObject({ sessionsThisWeek: 1 });
    expect(api.getTodaysFocus).toHaveBeenCalledTimes(1);
    expect(api.getMealLogs).toHaveBeenCalledWith({ recordedAt: expect.any(String) });
    expect(api.getWorkoutLogs).toHaveBeenCalledWith({ recordedAt: expect.any(String) });
    expect(api.getDoseLogs).toHaveBeenCalledWith();
    expect(api.getProgressOverview).toHaveBeenCalledTimes(1);
    expect(api.getTrainingToday).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent home refreshes (the App-level trigger's double-fetch guard)", async () => {
    const api = createMockApi({
      getMedicationCatalog: vi.fn().mockResolvedValue([]),
      getWeightLogs: vi.fn().mockResolvedValue([]),
      getLatestWeeklyVerdict: vi.fn().mockResolvedValue({ status: "available", verdict: { id: "v1" }, message: null }),
      getWorkouts: vi.fn().mockResolvedValue([]),
      getRecommendedWorkouts: vi.fn().mockResolvedValue([]),
      getProgressPhotos: vi.fn().mockResolvedValue([]),
      getTodaysFocus: vi.fn().mockResolvedValue(null),
      getProgressOverview: vi.fn().mockResolvedValue(null),
      getTrainingToday: vi.fn().mockResolvedValue(null),
      getMealLogs: vi.fn().mockResolvedValue([]),
      getWorkoutLogs: vi.fn().mockResolvedValue([]),
      getDoseLogs: vi.fn().mockResolvedValue([]),
    });
    const harness = await renderDataHarness(api);

    // Sign-in trigger + cold-start mount can both fire; the in-flight guard must
    // collapse concurrent home fetches into a single round of API calls.
    await act(async () => {
      await Promise.all([harness.value().refreshHomeData(), harness.value().refreshHomeData()]);
    });

    expect(api.getProfile).toHaveBeenCalledTimes(1);
    expect(api.getLatestWeeklyVerdict).toHaveBeenCalledTimes(1);
    expect(api.getTodaysFocus).toHaveBeenCalledTimes(1);
    expect(api.getTrainingToday).toHaveBeenCalledTimes(1);
  });

  it("keeps fulfilled home data when one home refresh call fails", async () => {
    const api = createMockApi({
      getTodaysFocus: vi.fn().mockRejectedValue(new Error("focus failed")),
    });
    const harness = await renderDataHarness(api);

    await act(async () => {
      await harness.value().refreshHomeData();
    });

    expect(harness.value().profile).toMatchObject({ id: "profile_1" });
    expect(harness.value().todaysMeals).toHaveLength(1);
    expect(harness.value().todaysWorkouts).toHaveLength(1);
    expect(harness.value().recentDoseLogs).toHaveLength(1);
    expect(harness.value().trainingToday).toMatchObject({ sessionsThisWeek: 1 });
    expect(harness.value().homeError).not.toBeNull();
  });

  it("tracks progress refresh errors separately from home errors", async () => {
    const api = createMockApi({
      getProgressPhotos: vi.fn().mockRejectedValue(new Error("photos failed")),
    });
    const harness = await renderDataHarness(api);

    await act(async () => {
      await harness.value().refreshProgress();
    });

    expect(harness.value().progressPhotosError).not.toBeNull();
    expect(harness.value().homeError).toBeNull();
  });

  it("refreshes workouts and today's training context together", async () => {
    const api = createMockApi({
      getWorkouts: vi.fn().mockResolvedValue([{ id: "library_workout" }]),
      getRecommendedWorkouts: vi.fn().mockResolvedValue([{ id: "recommended_workout" }]),
      getTrainingToday: vi.fn().mockResolvedValue({ sessionsThisWeek: 2, weeklyTarget: 3 }),
    });
    const harness = await renderDataHarness(api);

    await act(async () => {
      await harness.value().refreshWorkouts();
    });

    expect(harness.value().workouts).toEqual([{ id: "library_workout" }]);
    expect(harness.value().recommendedWorkouts).toEqual([{ id: "recommended_workout" }]);
    expect(harness.value().trainingToday).toMatchObject({ sessionsThisWeek: 2, weeklyTarget: 3 });
  });

  it("refreshes progress overview, weights, and photos together", async () => {
    const api = createMockApi({
      getProgressOverview: vi.fn().mockResolvedValue({ chart: { snapshots: [{ id: "snapshot_1" }] } }),
      getWeightLogs: vi.fn().mockResolvedValue([{ id: "weight_2" }]),
      getProgressPhotos: vi.fn().mockResolvedValue([{ id: "photo_2" }]),
    });
    const harness = await renderDataHarness(api);

    await act(async () => {
      await harness.value().refreshProgress();
    });

    expect(harness.value().progressOverview).toMatchObject({ chart: { snapshots: [{ id: "snapshot_1" }] } });
    expect(harness.value().weightLogs).toEqual([{ id: "weight_2" }]);
    expect(harness.value().progressPhotos).toEqual([{ id: "photo_2" }]);
  });
});
