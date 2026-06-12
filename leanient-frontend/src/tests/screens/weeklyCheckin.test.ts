import { describe, expect, it, vi } from "vitest";
import type { MealLog, WeightLog, WorkoutLog } from "@leanient/shared";
import {
  buildCheckinRequest,
  deriveCheckinPrefill,
  proteinAvgPerLoggedDay,
  resistanceCount,
  runWeeklyCheckinSubmit,
  weekRange,
  weekStartIso,
} from "../../screens/app/weeklyCheckin";
import {
  WEEKLY_CHECKIN_FLOATING_CTA_BOTTOM_PADDING,
  WEEKLY_CHECKIN_SCROLL_BOTTOM_PADDING,
} from "../../screens/app/weeklyCheckinLayout";

const STAMP = "2026-06-03T12:00:00.000Z";
function meal(over: Partial<MealLog>): MealLog {
  return {
    id: "m", userId: "u", recordedAt: STAMP, deletedAt: null, createdAt: STAMP, updatedAt: STAMP,
    source: "manual", foodName: "Bowl", protein: 30, calories: 500, ...over,
  };
}
function workout(over: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w", userId: "u", recordedAt: STAMP, deletedAt: null, createdAt: STAMP, updatedAt: STAMP,
    customWorkoutName: "Lift", exercises: [], durationMinutes: 22, countsAsResistance: true, ...over,
  };
}
function weightLog(over: Partial<WeightLog>): WeightLog {
  return {
    id: "wt", userId: "u", value: 184, unit: "lb", measuredAt: STAMP, source: "manual",
    createdAt: STAMP, updatedAt: STAMP, ...over,
  };
}

describe("week boundaries", () => {
  it("snaps to Monday (UTC) of the current week", () => {
    expect(weekStartIso(new Date("2026-06-04T12:00:00.000Z"))).toBe("2026-06-01"); // Thu -> Mon
    expect(weekStartIso(new Date("2026-06-01T00:00:00.000Z"))).toBe("2026-06-01"); // Mon -> Mon
    expect(weekStartIso(new Date("2026-06-07T23:00:00.000Z"))).toBe("2026-06-01"); // Sun -> Mon
  });

  it("gives a 7-day [from,to) range", () => {
    expect(weekRange(new Date("2026-06-04T12:00:00.000Z"))).toEqual({
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
    });
  });
});

describe("log aggregation", () => {
  it("averages protein over distinct logged days", () => {
    const meals = [
      meal({ recordedAt: "2026-06-01T08:00:00.000Z", protein: 40 }),
      meal({ recordedAt: "2026-06-01T13:00:00.000Z", protein: 20 }),
      meal({ recordedAt: "2026-06-02T13:00:00.000Z", protein: 60 }),
    ];
    expect(proteinAvgPerLoggedDay(meals)).toBe(60); // (40+20+60)/2 days
    expect(proteinAvgPerLoggedDay([])).toBe(0);
  });

  it("counts only resistance-flagged workouts", () => {
    expect(resistanceCount([workout(), workout({ countsAsResistance: false }), workout()])).toBe(2);
  });
});

describe("deriveCheckinPrefill", () => {
  it("confirms protein + training from this week's logs", () => {
    const p = deriveCheckinPrefill({
      weightLogs: [weightLog({ value: 182, measuredAt: "2026-06-03T00:00:00.000Z" }), weightLog({ value: 190, measuredAt: "2026-05-01T00:00:00.000Z" })],
      weekMeals: [meal({ protein: 50 }), meal({ recordedAt: "2026-06-02T12:00:00.000Z", protein: 50 })],
      weekWorkouts: [workout(), workout({ countsAsResistance: false })],
      fallbackUnit: "lb",
    });
    expect(p.weightValue).toBe(182); // latest by measuredAt
    expect(p.proteinFromLogs).toBe(true);
    expect(p.proteinGramsPerDay).toBe(50);
    expect(p.mealCount).toBe(2);
    expect(p.workoutsFromLogs).toBe(true);
    expect(p.resistanceWorkoutsCompleted).toBe(1);
  });

  it("starts manual entry at zero when there are no logs", () => {
    // Regression: this used to prefill the daily protein target, so a user who
    // tapped through the check-in recorded perfect adherence (994/994 on Home).
    const p = deriveCheckinPrefill({
      weightLogs: [],
      weekMeals: [],
      weekWorkouts: [],
      fallbackUnit: "kg",
    });
    expect(p.weightValue).toBeNull();
    expect(p.weightUnit).toBe("kg");
    expect(p.proteinFromLogs).toBe(false);
    expect(p.proteinGramsPerDay).toBe(0);
    expect(p.workoutsFromLogs).toBe(false);
    expect(p.resistanceWorkoutsCompleted).toBe(0);
  });
});

describe("buildCheckinRequest", () => {
  const now = new Date("2026-06-04T09:14:00.000Z");

  it("assembles a contract-valid request and stamps weekOf + measuredAt", () => {
    const req = buildCheckinRequest({
      now,
      weight: { value: 184.2, unit: "lb" },
      proteinGramsPerDay: 128,
      resistanceWorkoutsCompleted: 2,
      sideEffects: ["nausea", "fatigue"],
      notes: "  felt good  ",
    });
    expect(req).toEqual({
      weekOf: "2026-06-01",
      weight: { value: 184.2, unit: "lb", measuredAt: "2026-06-04T09:14:00.000Z" },
      proteinGramsPerDay: 128,
      resistanceWorkoutsCompleted: 2,
      sideEffects: ["nausea", "fatigue"],
      notes: "felt good",
    });
  });

  it("omits notes when blank and keeps an empty side-effects array", () => {
    const req = buildCheckinRequest({
      now,
      weight: { value: 80, unit: "kg" },
      proteinGramsPerDay: 100,
      resistanceWorkoutsCompleted: 0,
      sideEffects: [],
      notes: "   ",
    });
    expect(req.notes).toBeUndefined();
    expect(req.sideEffects).toEqual([]);
  });
});

describe("weekly check-in submit flow", () => {
  it("does not surface a refresh failure after the check-in was saved", async () => {
    const onComplete = vi.fn();
    const onError = vi.fn();

    const saved = await runWeeklyCheckinSubmit({
      submitRequest: async () => ({
        id: "verdict_1",
        userId: "user_1",
        weekOf: "2026-06-01",
        checkinId: "checkin_1",
        source: "checkin",
        engineVersion: "v1.0",
        copyVersion: null,
        explanation: null,
        status: "on_track",
        score: 90,
        estimatedLeanMassRisk: 0.1,
        nextActionCode: "keep_rhythm",
        headline: "Keep going",
        message: "This week is on track.",
        explanationFactors: [],
        createdAt: STAMP,
        updatedAt: STAMP,
      }),
      refreshHomeData: async () => {
        throw new Error("cached 304 refresh miss");
      },
      onComplete,
      onError,
      errorMessage: () => "Something went wrong. Please try again.",
    });

    expect(saved).toBe(true);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ id: "verdict_1" }));
    expect(onError).not.toHaveBeenCalled();
  });

  it("refreshes progress data after a saved check-in", async () => {
    const onComplete = vi.fn();
    const refreshProgressData = vi.fn(async () => undefined);

    const saved = await runWeeklyCheckinSubmit({
      submitRequest: async () => ({
        id: "verdict_2",
        userId: "user_1",
        weekOf: "2026-06-01",
        checkinId: "checkin_1",
        source: "checkin",
        engineVersion: "v1.0",
        copyVersion: null,
        explanation: null,
        status: "on_track",
        score: 90,
        estimatedLeanMassRisk: 0.1,
        nextActionCode: "keep_rhythm",
        headline: "Keep going",
        message: "This week is on track.",
        explanationFactors: [],
        createdAt: STAMP,
        updatedAt: STAMP,
      }),
      refreshHomeData: async () => undefined,
      refreshProgressData,
      onComplete,
      onError: vi.fn(),
      errorMessage: () => "Something went wrong. Please try again.",
    });

    expect(saved).toBe(true);
    expect(refreshProgressData).toHaveBeenCalledTimes(1);
  });
});

describe("weekly check-in keyboard-safe layout", () => {
  it("reserves enough bottom space for the floating submit button", () => {
    expect(WEEKLY_CHECKIN_FLOATING_CTA_BOTTOM_PADDING).toBeGreaterThanOrEqual(12);
    expect(WEEKLY_CHECKIN_SCROLL_BOTTOM_PADDING).toBeGreaterThanOrEqual(
      WEEKLY_CHECKIN_FLOATING_CTA_BOTTOM_PADDING + 120,
    );
  });
});
