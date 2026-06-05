import type { Workout } from "@leanient/shared";

/**
 * Typed Workout fixtures for the Train screen (library + today's recommendation).
 * Swap for the live `LeanientDataContext.workouts` / `recommendedWorkouts`
 * (`GET /workouts`, `GET /training/today`) at integration. Typed against shared.
 */
const STAMP = "2026-06-01T12:00:00.000Z";

const base = {
  exercises: [],
  safetyNotes: [],
  version: 1,
  active: true,
  createdAt: STAMP,
  updatedAt: STAMP,
} satisfies Pick<Workout, "exercises" | "safetyNotes" | "version" | "active" | "createdAt" | "updatedAt">;

/** Exercise list for the recommended session — drives the workout player. */
const upperBodyExercises: Workout["exercises"] = [
  { name: "Dumbbell floor press", sets: 3, reps: "10", restSeconds: 45, muscleGroups: ["Chest"], notes: "Lower for 3 seconds, press up strong. Slow tempo is what protects the muscle." },
  { name: "Bent-over row", sets: 3, reps: "10", restSeconds: 45, muscleGroups: ["Back"], notes: "Squeeze the shoulder blades. Pull to the ribs, not the chest." },
  { name: "Overhead press", sets: 3, reps: "8", restSeconds: 45, muscleGroups: ["Shoulders"], notes: "Brace the core. Press straight up, no arching the back." },
  { name: "Chest-supported row", sets: 3, reps: "10", restSeconds: 45, muscleGroups: ["Back"], notes: "Let the bench take the weight. Full stretch each rep." },
  { name: "Lateral raise", sets: 3, reps: "12", restSeconds: 30, muscleGroups: ["Shoulders"], notes: "Light and controlled. Lead with the elbows." },
  { name: "Hammer curl", sets: 3, reps: "10", restSeconds: 30, muscleGroups: ["Arms"], notes: "No swing. Slow on the way down." },
  { name: "Triceps extension", sets: 3, reps: "12", restSeconds: 30, muscleGroups: ["Arms"], notes: "Keep the elbows tucked. Full lockout at the bottom." },
  { name: "Face pull", sets: 3, reps: "15", restSeconds: 30, muscleGroups: ["Shoulders"], notes: "Pull to the forehead. Open the shoulders at the end." },
];

/** Today's recommended session (energy-aware). */
export const mockRecommendedWorkout: Workout = {
  ...base,
  id: "wk_upper",
  slug: "upper-body-dumbbell",
  title: "Upper body",
  shortDescription: "Energy's good today — let's bank a muscle-building session. Dumbbells only.",
  focus: "losing_muscle",
  energyPhase: "steady_energy",
  durationMinutes: 22,
  difficulty: "intermediate",
  equipment: "dumbbells",
  intensity: "moderate",
  muscleGroups: ["Chest", "Back", "Arms"],
  category: "strength",
  exercises: upperBodyExercises,
  tags: ["Chest", "Back", "Arms", "Moderate"],
};

export const mockWorkouts: Workout[] = [
  {
    ...base,
    id: "wk_lower",
    slug: "lower-body-strength",
    title: "Lower body strength",
    shortDescription: "Quads, glutes, hamstrings with dumbbells.",
    focus: "losing_muscle",
    energyPhase: "steady_energy",
    durationMinutes: 28,
    difficulty: "intermediate",
    equipment: "dumbbells",
    intensity: "moderate",
    muscleGroups: ["Legs", "Glutes"],
    category: "strength",
    tags: ["Legs"],
  },
  {
    ...base,
    id: "wk_full",
    slug: "full-body-dumbbell",
    title: "Full-body dumbbell",
    shortDescription: "A complete dumbbell circuit.",
    focus: "strength",
    energyPhase: "high_energy",
    durationMinutes: 30,
    difficulty: "intermediate",
    equipment: "dumbbells",
    intensity: "hard",
    muscleGroups: ["Full body"],
    category: "conditioning",
    tags: ["Full body"],
  },
  {
    ...base,
    id: "wk_core",
    slug: "core-posture",
    title: "Core & posture",
    shortDescription: "Bodyweight core and posture work.",
    focus: "strength",
    energyPhase: "low_energy",
    durationMinutes: 15,
    difficulty: "beginner",
    equipment: "bodyweight",
    intensity: "easy",
    muscleGroups: ["Core"],
    category: "mobility",
    tags: ["Core"],
  },
  {
    ...base,
    id: "wk_shotday",
    slug: "shot-day-mobility",
    title: "Shot-day mobility",
    shortDescription: "Gentle movement for low-energy shot days.",
    focus: "energy",
    energyPhase: "shot_day",
    durationMinutes: 12,
    difficulty: "beginner",
    equipment: "gentle",
    intensity: "recovery",
    muscleGroups: ["Mobility"],
    category: "recovery",
    tags: ["Recovery"],
  },
];
