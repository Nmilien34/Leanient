import type {
  EquipmentAccess,
  LeanientFocusArea,
  Workout,
  WorkoutCategory,
  WorkoutDifficulty,
  WorkoutEnergyPhase,
  WorkoutEquipment,
  WorkoutIntensity,
} from "@leanient/shared";
import { beforeEach, describe, expect, it } from "vitest";
import type { ShotDayContext } from "../../lib/shotDay";
import {
  recommendFeaturedWorkout,
  WorkoutRecommendationError,
} from "../../services/workoutRecommendation.service";

function workout(overrides: Partial<Workout> & { slug: string }): Workout {
  const now = "2026-06-01T00:00:00.000Z";
  return {
    id: overrides.id ?? `workout_${overrides.slug}`,
    slug: overrides.slug,
    title: overrides.title ?? overrides.slug,
    shortDescription: overrides.shortDescription ?? "A short workout",
    focus: (overrides.focus ?? "strength") as LeanientFocusArea,
    energyPhase: (overrides.energyPhase ?? "steady_energy") as WorkoutEnergyPhase,
    durationMinutes: overrides.durationMinutes ?? 20,
    difficulty: (overrides.difficulty ?? "beginner") as WorkoutDifficulty,
    equipment: (overrides.equipment ?? "bodyweight") as WorkoutEquipment,
    intensity: (overrides.intensity ?? "easy") as WorkoutIntensity,
    muscleGroups: overrides.muscleGroups ?? ["full body"],
    category: (overrides.category ?? "strength") as WorkoutCategory,
    exercises: overrides.exercises ?? [
      {
        name: "Squat",
        sets: 3,
        reps: "10",
        restSeconds: 60,
        muscleGroups: ["legs"],
        notes: null,
      },
    ],
    safetyNotes: overrides.safetyNotes ?? [],
    tags: overrides.tags ?? [],
    version: overrides.version ?? 1,
    active: overrides.active ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

const baseCatalog = [
  workout({
    slug: "shot-day-mobility",
    equipment: "gentle",
    intensity: "recovery",
    category: "mobility",
    durationMinutes: 12,
  }),
  workout({
    slug: "core-and-posture",
    equipment: "bodyweight",
    intensity: "easy",
    category: "strength",
    durationMinutes: 15,
  }),
  workout({
    slug: "bodyweight-basics",
    equipment: "bodyweight",
    intensity: "easy",
    category: "strength",
    durationMinutes: 15,
  }),
  workout({
    slug: "upper-body-dumbbell",
    equipment: "dumbbells",
    intensity: "moderate",
    category: "strength",
    durationMinutes: 22,
    muscleGroups: ["chest", "back", "arms"],
  }),
  workout({
    slug: "lower-body-strength",
    equipment: "dumbbells",
    intensity: "moderate",
    category: "strength",
    durationMinutes: 28,
    muscleGroups: ["legs", "glutes"],
  }),
  workout({
    slug: "push-day-dumbbell",
    equipment: "dumbbells",
    intensity: "moderate",
    category: "strength",
  }),
  workout({
    slug: "pull-day-dumbbell",
    equipment: "dumbbells",
    intensity: "moderate",
    category: "strength",
  }),
  workout({
    slug: "full-body-dumbbell",
    equipment: "dumbbells",
    intensity: "hard",
    category: "strength",
    durationMinutes: 30,
  }),
];

function shotDayContext(label: string | null): ShotDayContext {
  return {
    isOnProtocol: label !== null,
    daysSinceLastDose: label ? Number(label.replace("SHOT DAY +", "")) || 0 : null,
    daysUntilNextDose: label ? 7 : null,
    shotDayLabel: label,
    nextDoseDate: label ? new Date("2026-06-08T00:00:00.000Z") : null,
  };
}

function input(overrides: {
  equipmentAccess?: EquipmentAccess;
  energy?: "good" | "mid" | "low" | null;
  sessionsThisWeek?: number;
  weeklyTarget?: number;
  shotDayLabel?: string | null;
  recentWorkoutSlugs?: Array<{ slug: string; recordedAt: string }>;
} = {}) {
  return {
    userId: "user_1",
    shotDayContext: shotDayContext(overrides.shotDayLabel ?? "SHOT DAY +3"),
    energy: overrides.energy ?? "mid",
    sessionsThisWeek: overrides.sessionsThisWeek ?? 1,
    weeklyTarget: overrides.weeklyTarget ?? 3,
    recentWorkoutLogs:
      overrides.recentWorkoutSlugs?.map((entry) => ({
        workoutId: `workout_${entry.slug}`,
        recordedAt: new Date(entry.recordedAt),
      })) ?? [],
    userProfile: {
      equipmentAccess: overrides.equipmentAccess ?? "dumbbells",
      biggestFear: "losing_muscle",
    },
  };
}

describe("workout recommendation service", () => {
  beforeEach(() => {
    // The recommendation function uses passed-in catalog data in tests so the
    // deterministic rules can be exercised without Mongo.
  });

  it("recommends shot-day mobility for shot day with low energy", async () => {
    const result = await recommendFeaturedWorkout(input({ shotDayLabel: "SHOT DAY", energy: "low" }), {
      catalog: baseCatalog,
    });

    expect(result.workout.slug).toBe("shot-day-mobility");
    expect(result.selectionReason).toBe("shot_day_recovery");
  });

  it("recommends low-intensity work for low energy away from shot day", async () => {
    const result = await recommendFeaturedWorkout(input({ shotDayLabel: "SHOT DAY +3", energy: "low" }), {
      catalog: baseCatalog,
    });

    expect(["core-and-posture", "bodyweight-basics"]).toContain(result.workout.slug);
    expect(result.workout.intensity).toBe("easy");
    expect(result.selectionReason).toBe("low_energy");
  });

  it("recommends a short workout when the user is behind target", async () => {
    const result = await recommendFeaturedWorkout(
      input({ sessionsThisWeek: 0, weeklyTarget: 3, equipmentAccess: "dumbbells" }),
      { catalog: baseCatalog },
    );

    expect(result.workout.slug).toBe("core-and-posture");
    expect(result.selectionReason).toBe("behind_target");
  });

  it("rotates strength workouts and avoids repeating a workout from the last three days", async () => {
    const result = await recommendFeaturedWorkout(
      input({
        energy: "good",
        sessionsThisWeek: 3,
        weeklyTarget: 3,
        recentWorkoutSlugs: [{ slug: "upper-body-dumbbell", recordedAt: "2026-06-02T12:00:00.000Z" }],
      }),
      { catalog: baseCatalog, today: new Date("2026-06-03T12:00:00.000Z") },
    );

    expect(result.workout.slug).not.toBe("upper-body-dumbbell");
    expect(result.workout.category).toBe("strength");
    expect(result.selectionReason).toBe("strength_rotation");
  });

  it("uses upper-body dumbbell as the default when eligible", async () => {
    const result = await recommendFeaturedWorkout(input({ energy: "mid", sessionsThisWeek: 2 }), {
      catalog: baseCatalog,
    });

    expect(result.workout.slug).toBe("upper-body-dumbbell");
    expect(result.selectionReason).toBe("default");
  });

  it("never returns dumbbell workouts for users with no equipment", async () => {
    const result = await recommendFeaturedWorkout(
      input({ equipmentAccess: "none", energy: "good", sessionsThisWeek: 3 }),
      { catalog: baseCatalog },
    );

    expect(["bodyweight", "gentle"]).toContain(result.workout.equipment);
  });

  it("returns gentle shot-day mobility for no-equipment users on shot day", async () => {
    const result = await recommendFeaturedWorkout(
      input({ equipmentAccess: "none", shotDayLabel: "SHOT DAY", energy: "low" }),
      { catalog: baseCatalog },
    );

    expect(result.workout.slug).toBe("shot-day-mobility");
    expect(result.workout.equipment).toBe("gentle");
  });

  it("throws a domain error when there is no eligible workout", async () => {
    await expect(
      recommendFeaturedWorkout(input({ equipmentAccess: "none" }), {
        catalog: [workout({ slug: "gym-only", equipment: "gym" })],
      }),
    ).rejects.toBeInstanceOf(WorkoutRecommendationError);
  });
});
