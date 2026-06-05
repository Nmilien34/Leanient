import { describe, expect, it } from "vitest";
import type { MealLog, WorkoutLog } from "@leanient/shared";
import { toTodayLog } from "../../screens/app/todayMetrics";

function meal(over: Partial<MealLog>): MealLog {
  return {
    id: "m1",
    userId: "u1",
    recordedAt: "2026-06-03T13:05:00.000Z",
    deletedAt: null,
    createdAt: "2026-06-03T13:05:00.000Z",
    updatedAt: "2026-06-03T13:05:00.000Z",
    source: "manual",
    foodName: "Chicken & rice bowl",
    protein: 26,
    calories: 520,
    ...over,
  };
}

function workout(over: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w1",
    userId: "u1",
    recordedAt: "2026-06-03T18:05:00.000Z",
    deletedAt: null,
    createdAt: "2026-06-03T18:05:00.000Z",
    updatedAt: "2026-06-03T18:05:00.000Z",
    customWorkoutName: "Resistance",
    exercises: [],
    durationMinutes: 22,
    countsAsResistance: true,
    ...over,
  };
}

describe("toTodayLog", () => {
  it("maps meals to protein-gram entries that sum into the ring", () => {
    const log = toTodayLog([
      meal({ foodName: "Greek yogurt", protein: 32 }),
      meal({ foodName: "Chicken bowl", protein: 26 }),
    ]);

    expect(log.meals.map((m) => m.name)).toEqual(["Greek yogurt", "Chicken bowl"]);
    expect(log.meals.map((m) => m.grams)).toEqual([32, 26]);
    expect(log.meals.reduce((sum, m) => sum + m.grams, 0)).toBe(58);
    expect(log.workoutsDone).toBe(0);
  });

  it("rounds protein and returns an empty log for no meals", () => {
    expect(toTodayLog([meal({ protein: 30.6 })]).meals[0].grams).toBe(31);
    expect(toTodayLog([])).toEqual({ meals: [], workoutsDone: 0 });
  });

  it("counts today's workout logs into the session metric", () => {
    const log = toTodayLog([meal({ protein: 30.6 })], [
      workout({ id: "w1" }),
      workout({ id: "w2", countsAsResistance: false }),
    ]);

    expect(log.workoutsDone).toBe(2);
  });
});
