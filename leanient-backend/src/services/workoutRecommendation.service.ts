import type {
  EquipmentAccess,
  Workout,
  WorkoutEquipment,
  WorkoutSelectionReason,
} from "@leanient/shared";
import type { ShotDayContext } from "../lib/shotDay";
import type { WorkoutLogDocument } from "../models/workoutLog.model";
import { WorkoutModel } from "../models/workout.model";
import { serializeWorkout } from "./serializers";

export const RECOMMENDATION_ENGINE_VERSION = "v1.0";

export class WorkoutRecommendationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkoutRecommendationError";
  }
}

interface RecentWorkoutLike {
  workoutId?: unknown;
  recordedAt: Date;
}

export interface RecommendFeaturedWorkoutInput {
  userId: string;
  shotDayContext: ShotDayContext;
  energy: "good" | "mid" | "low" | null;
  sessionsThisWeek: number;
  weeklyTarget: number;
  recentWorkoutLogs: Array<Pick<WorkoutLogDocument, "workoutId" | "recordedAt">> | RecentWorkoutLike[];
  userProfile: {
    equipmentAccess: EquipmentAccess;
    biggestFear?: string;
  };
}

interface RecommendOptions {
  catalog?: Workout[];
  today?: Date;
}

export interface FeaturedWorkoutRecommendation {
  workout: Workout;
  selectionReason: WorkoutSelectionReason;
}

function allowedEquipment(equipmentAccess: EquipmentAccess): Set<WorkoutEquipment> {
  switch (equipmentAccess) {
    case "none":
    case "bodyweight_only":
      return new Set(["bodyweight", "gentle"]);
    case "dumbbells":
      return new Set(["bodyweight", "gentle", "dumbbells"]);
    case "full_gym":
      return new Set(["none", "bodyweight", "dumbbells", "minimal", "gym", "gentle"]);
  }
}

function findBySlug(workouts: Workout[], slug: string): Workout | null {
  return workouts.find((workout) => workout.slug === slug) ?? null;
}

function firstAvailable(workouts: Workout[], slugs: string[]): Workout | null {
  for (const slug of slugs) {
    const workout = findBySlug(workouts, slug);
    if (workout) {
      return workout;
    }
  }

  return null;
}

function workoutIdForSlug(slug: string): string {
  return `workout_${slug}`;
}

function completedSlugMap(
  recentWorkoutLogs: RecentWorkoutLike[],
  catalog: Workout[],
): Map<string, Date> {
  const idToSlug = new Map(catalog.map((workout) => [workout.id, workout.slug]));
  const completed = new Map<string, Date>();

  for (const log of recentWorkoutLogs) {
    const id = typeof log.workoutId === "string" ? log.workoutId : log.workoutId?.toString?.();
    const slug = id ? (idToSlug.get(id) ?? idToSlug.get(workoutIdForSlug(id))) ?? id.replace(/^workout_/, "") : null;

    if (!slug) {
      continue;
    }

    const existing = completed.get(slug);
    if (!existing || log.recordedAt > existing) {
      completed.set(slug, log.recordedAt);
    }
  }

  return completed;
}

function completedWithinDays(slug: string, completed: Map<string, Date>, today: Date, days: number): boolean {
  const recordedAt = completed.get(slug);
  if (!recordedAt) {
    return false;
  }

  const elapsedMs = today.getTime() - recordedAt.getTime();
  return elapsedMs >= 0 && elapsedMs <= days * 24 * 60 * 60 * 1000;
}

function lessRecentlyCompleted(
  left: Workout,
  right: Workout,
  completed: Map<string, Date>,
): Workout {
  const leftCompleted = completed.get(left.slug)?.getTime() ?? 0;
  const rightCompleted = completed.get(right.slug)?.getTime() ?? 0;
  return leftCompleted <= rightCompleted ? left : right;
}

async function loadActiveCatalog(): Promise<Workout[]> {
  const workouts = await WorkoutModel.find({ active: true }).sort({ title: 1 });
  return workouts.map(serializeWorkout);
}

export async function recommendFeaturedWorkout(
  input: RecommendFeaturedWorkoutInput,
  options: RecommendOptions = {},
): Promise<FeaturedWorkoutRecommendation> {
  const catalog = options.catalog ?? (await loadActiveCatalog());
  const eligible = catalog.filter((workout) =>
    allowedEquipment(input.userProfile.equipmentAccess).has(workout.equipment),
  );

  if (eligible.length === 0) {
    throw new WorkoutRecommendationError(
      `No workouts match equipment access ${input.userProfile.equipmentAccess}`,
    );
  }

  const energy = input.energy ?? "mid";
  const completed = completedSlugMap(input.recentWorkoutLogs as RecentWorkoutLike[], catalog);
  const today = options.today ?? new Date();

  if (
    (input.shotDayContext.shotDayLabel === "SHOT DAY" ||
      input.shotDayContext.shotDayLabel === "SHOT DAY +1") &&
    (input.energy === "low" || input.energy === null)
  ) {
    const shotDayWorkout = findBySlug(eligible, "shot-day-mobility");
    if (shotDayWorkout) {
      return {
        workout: shotDayWorkout,
        selectionReason: "shot_day_recovery",
      };
    }
  }

  if (energy === "low") {
    const core = findBySlug(eligible, "core-and-posture");
    const basics = findBySlug(eligible, "bodyweight-basics");
    const workout = core && basics ? lessRecentlyCompleted(core, basics, completed) : core ?? basics;

    if (workout) {
      return {
        workout,
        selectionReason: "low_energy",
      };
    }
  }

  if (input.sessionsThisWeek < input.weeklyTarget - 1) {
    const preferred =
      input.userProfile.equipmentAccess === "none" || input.userProfile.equipmentAccess === "bodyweight_only"
        ? firstAvailable(eligible, ["bodyweight-basics", "core-and-posture"])
        : firstAvailable(eligible, ["core-and-posture", "bodyweight-basics"]);

    if (preferred) {
      return {
        workout: preferred,
        selectionReason: "behind_target",
      };
    }

    return {
      workout: [...eligible].sort((left, right) => left.durationMinutes - right.durationMinutes)[0],
      selectionReason: "behind_target",
    };
  }

  if (energy === "good" && input.sessionsThisWeek >= input.weeklyTarget) {
    const strengthPool = [
      "upper-body-dumbbell",
      "lower-body-strength",
      "push-day-dumbbell",
      "pull-day-dumbbell",
      "full-body-dumbbell",
    ]
      .map((slug) => findBySlug(eligible, slug))
      .filter((workout): workout is Workout => Boolean(workout))
      .filter((workout) => !completedWithinDays(workout.slug, completed, today, 3));

    const workout =
      strengthPool[0] ??
      eligible.find((candidate) => candidate.category === "strength") ??
      eligible[0];

    return {
      workout,
      selectionReason: "strength_rotation",
    };
  }

  const defaultWorkout =
    findBySlug(eligible, "upper-body-dumbbell") ??
    eligible.find((workout) => workout.category === "strength") ??
    eligible[0];

  return {
    workout: defaultWorkout,
    selectionReason: "default",
  };
}
