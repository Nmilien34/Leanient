import type { EquipmentAccess, Workout, WorkoutCategory } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockWorkoutDocument extends Omit<Workout, "id" | "createdAt" | "updatedAt"> {
  _id: { toString: () => string };
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  const workouts: MockWorkoutDocument[] = [];

  function clone(workout: MockWorkoutDocument): MockWorkoutDocument {
    return {
      ...workout,
      _id: workout._id,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        muscleGroups: [...exercise.muscleGroups],
      })),
      muscleGroups: [...workout.muscleGroups],
      safetyNotes: [...workout.safetyNotes],
      tags: [...workout.tags],
    };
  }

  function matches(workout: MockWorkoutDocument, filter: Record<string, unknown>): boolean {
    if (filter.active !== undefined && workout.active !== filter.active) {
      return false;
    }

    if (filter.slug !== undefined && workout.slug !== filter.slug) {
      return false;
    }

    if (filter.category !== undefined && workout.category !== filter.category) {
      return false;
    }

    return true;
  }

  const WorkoutModel = {
    updateOne: vi.fn(async (filter, update) => {
      const existingIndex = workouts.findIndex((workout) => workout.slug === filter.slug);
      const next: MockWorkoutDocument = {
        _id: { toString: () => `workout_${update.$set.slug}` },
        ...update.$set,
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
        updatedAt: new Date("2026-06-01T12:00:00.000Z"),
      };

      if (existingIndex === -1) {
        workouts.push(next);
      } else {
        workouts[existingIndex] = {
          ...workouts[existingIndex],
          ...next,
          _id: workouts[existingIndex]._id,
          updatedAt: new Date("2026-06-02T12:00:00.000Z"),
        };
      }
    }),
    find: vi.fn((filter: Record<string, unknown>) => ({
      sort: vi.fn(async () => workouts.filter((workout) => matches(workout, filter)).map(clone)),
    })),
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      const workout = workouts.find((candidate) => matches(candidate, filter));
      return workout ? clone(workout) : null;
    }),
  };

  return {
    WorkoutModel,
    workouts,
    reset: () => {
      workouts.splice(0, workouts.length);
      WorkoutModel.updateOne.mockClear();
      WorkoutModel.find.mockClear();
      WorkoutModel.findOne.mockClear();
    },
  };
});

vi.mock("../../models/workout.model", () => ({
  WorkoutModel: modelMocks.WorkoutModel,
}));

import {
  getWorkoutBySlug,
  listWorkoutsForUser,
  seedWorkouts,
} from "../../services/workout.service";

describe("workout service", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("seeds the catalog idempotently with legacy workouts inactive", async () => {
    await seedWorkouts();
    await seedWorkouts();

    const slugs = modelMocks.workouts.map((workout) => workout.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(modelMocks.workouts.filter((workout) => workout.active)).toHaveLength(14);
    expect(modelMocks.workouts.find((workout) => workout.slug === "shot-day-reset")).toMatchObject({
      active: false,
    });
    expect(modelMocks.workouts.find((workout) => workout.slug === "muscle-signal-a")).toMatchObject({
      active: false,
    });
    expect(modelMocks.workouts.map((workout) => workout.slug)).toEqual(
      expect.arrayContaining([
        "upper-body-dumbbell",
        "lower-body-strength",
        "full-body-dumbbell",
        "core-and-posture",
        "shot-day-mobility",
        "push-day-dumbbell",
        "pull-day-dumbbell",
        "bodyweight-basics",
        "outdoor-muscle-walk",
        "apartment-strength-reset",
        "dumbbell-muscle-base",
        "chair-strength-circuit",
        "no-jump-conditioning",
        "dumbbell-home-circuit",
      ]),
    );
  });

  it.each<[EquipmentAccess, string[]]>([
    [
      "none",
      [
        "apartment-strength-reset",
        "bodyweight-basics",
        "chair-strength-circuit",
        "core-and-posture",
        "no-jump-conditioning",
        "outdoor-muscle-walk",
        "shot-day-mobility",
      ],
    ],
    [
      "bodyweight_only",
      [
        "apartment-strength-reset",
        "bodyweight-basics",
        "chair-strength-circuit",
        "core-and-posture",
        "no-jump-conditioning",
        "outdoor-muscle-walk",
        "shot-day-mobility",
      ],
    ],
    [
      "dumbbells",
      [
        "apartment-strength-reset",
        "bodyweight-basics",
        "chair-strength-circuit",
        "core-and-posture",
        "dumbbell-muscle-base",
        "dumbbell-home-circuit",
        "no-jump-conditioning",
        "outdoor-muscle-walk",
        "shot-day-mobility",
        "upper-body-dumbbell",
        "lower-body-strength",
        "full-body-dumbbell",
        "push-day-dumbbell",
        "pull-day-dumbbell",
      ],
    ],
  ])("filters active workouts for %s equipment access", async (equipmentAccess, expectedSlugs) => {
    await seedWorkouts();

    const result = await listWorkoutsForUser(equipmentAccess);

    expect(result.map((workout) => workout.slug).sort()).toEqual(expectedSlugs.sort());
    expect(result.every((workout) => workout.active)).toBe(true);
  });

  it("filters active workouts by category", async () => {
    await seedWorkouts();

    const result = await listWorkoutsForUser("full_gym", {
      category: "mobility" as WorkoutCategory,
    });

    expect(result.map((workout) => workout.slug)).toEqual(["shot-day-mobility"]);
  });

  it("returns null for missing or inactive workout slugs", async () => {
    await seedWorkouts();

    await expect(getWorkoutBySlug("missing")).resolves.toBeNull();
    await expect(getWorkoutBySlug("shot-day-reset")).resolves.toBeNull();
  });
});
