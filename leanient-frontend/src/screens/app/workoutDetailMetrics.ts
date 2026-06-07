import type { Workout, WorkoutCategory } from "@leanient/shared";

export interface WorkoutDetailExercise {
  name: string;
  detail: string;
  note: string | null;
}

export interface WorkoutDetailView {
  title: string;
  subtitle: string;
  eyebrow: string;
  meta: string;
  tags: string[];
  muscleGroups: string[];
  exercises: WorkoutDetailExercise[];
  safetyNotes: string[];
  coachLine: string;
  canStart: boolean;
  startLabel: string;
}

const CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  strength: "Resistance session",
  conditioning: "Conditioning session",
  mobility: "Mobility session",
  recovery: "Recovery session",
};

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function coachLineFor(workout: Workout): string {
  switch (workout.category) {
    case "strength":
      return "This one counts toward your resistance target, the signal your body needs to keep muscle while weight is moving down.";
    case "conditioning":
      return "Keep this controlled. The goal is useful work without digging a recovery hole.";
    case "mobility":
      return "A low-friction session keeps you moving when appetite or energy is uneven.";
    case "recovery":
    default:
      return "Gentle work still counts. Use this when shot-day energy is lower and you want to stay connected to the plan.";
  }
}

export function deriveWorkoutDetail(workout: Workout): WorkoutDetailView {
  const canStart = workout.exercises.length > 0;

  return {
    title: workout.title,
    subtitle: workout.shortDescription,
    eyebrow: CATEGORY_LABEL[workout.category],
    meta: `${workout.durationMinutes} min · ${titleCase(workout.equipment)} · ${titleCase(workout.intensity)}`,
    tags: workout.tags,
    muscleGroups: workout.muscleGroups.map(titleCase),
    exercises: workout.exercises.map((exercise) => ({
      name: exercise.name,
      detail: `${exercise.sets} sets · ${exercise.reps} reps · ${exercise.restSeconds}s rest`,
      note: exercise.notes,
    })),
    safetyNotes: workout.safetyNotes,
    coachLine: coachLineFor(workout),
    canStart,
    startLabel: canStart ? "Start workout" : "Guided steps coming soon",
  };
}
