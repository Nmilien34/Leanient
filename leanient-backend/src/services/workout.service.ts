import type {
  EquipmentAccess,
  LeanientFocusArea,
  WorkoutCategory,
  WorkoutEnergyPhase,
  WorkoutEquipment,
} from "@leanient/shared";
import { WORKOUT_CATALOG_SEED } from "../data/workoutCatalog.seed";
import { WorkoutModel, type WorkoutDocument } from "../models/workout.model";
import { serializeWorkout } from "./serializers";

interface WorkoutFilters {
  category?: WorkoutCategory;
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

export async function seedWorkouts(): Promise<number> {
  await Promise.all(
    WORKOUT_CATALOG_SEED.map((workout) =>
      WorkoutModel.updateOne({ slug: workout.slug }, { $set: workout }, { upsert: true }),
    ),
  );

  return WORKOUT_CATALOG_SEED.length;
}

export async function listWorkouts() {
  const workouts = await WorkoutModel.find({ active: true }).sort({ category: 1, title: 1 });
  return workouts.map(serializeWorkout);
}

export async function listWorkoutsForUser(
  equipmentAccess: EquipmentAccess,
  filters: WorkoutFilters = {},
) {
  const query: Record<string, unknown> = {
    active: true,
  };

  if (filters.category) {
    query.category = filters.category;
  }

  const workouts = await WorkoutModel.find(query).sort({ category: 1, title: 1 });
  const equipment = allowedEquipment(equipmentAccess);
  return workouts.filter((workout) => equipment.has(workout.equipment)).map(serializeWorkout);
}

export async function getWorkoutBySlug(slug: string) {
  const workout = await WorkoutModel.findOne({ slug, active: true });
  return workout ? serializeWorkout(workout) : null;
}

export async function getRecommendedWorkouts(params: {
  focus?: LeanientFocusArea;
  energyPhase?: WorkoutEnergyPhase;
}) {
  const filter: Partial<Pick<WorkoutDocument, "active" | "focus" | "energyPhase">> = {
    active: true,
  };

  if (params.focus) {
    filter.focus = params.focus;
  }

  if (params.energyPhase) {
    filter.energyPhase = params.energyPhase;
  }

  const workouts = await WorkoutModel.find(filter).sort({ durationMinutes: 1, title: 1 }).limit(6);
  return workouts.map(serializeWorkout);
}
