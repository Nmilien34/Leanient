import type { WorkoutEffort } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Workout screen (35). A manual workout log has
 * no exercises, so the form captures type + duration + effort, and whether it
 * counts as a resistance session (the signal the verdict engine credits).
 * `buildWorkoutLogDraft` produces the payload that maps to the shared
 * `WorkoutLog` contract, so what gets saved is traceable and testable.
 */

export type WorkoutType = "resistance" | "cardio" | "walk" | "class" | "other";

export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "resistance", label: "Resistance" },
  { id: "cardio", label: "Cardio" },
  { id: "walk", label: "Walk" },
  { id: "class", label: "Class" },
  { id: "other", label: "Other" },
];

export const DURATION_OPTIONS = [15, 22, 30, 45, 60]; // minutes

// "normal" is the contract value; the UI labels it "Moderate".
export const EFFORT_OPTIONS: { id: WorkoutEffort; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Moderate" },
  { id: "hard", label: "Hard" },
];

const TYPE_LABEL: Record<WorkoutType, string> = Object.fromEntries(WORKOUT_TYPES.map((t) => [t.id, t.label])) as Record<
  WorkoutType,
  string
>;

/** Only resistance training protects muscle on a GLP-1, so it's the default credit. */
export function defaultCountsAsResistance(type: WorkoutType): boolean {
  return type === "resistance";
}

export interface WorkoutLogForm {
  type: WorkoutType;
  durationMinutes: number;
  effort: WorkoutEffort;
  countsAsResistance: boolean;
}

export const initialWorkoutLogForm: WorkoutLogForm = {
  type: "resistance",
  durationMinutes: 22,
  effort: "normal",
  countsAsResistance: true,
};

export interface WorkoutLogDraft {
  customWorkoutName: string;
  durationMinutes: number;
  perceivedEffort: WorkoutEffort;
  exercises: [];
  /** Whether this session counts toward the weekly resistance target (verdict). */
  countsAsResistance: boolean;
  recordedAt: string;
}

/** Map the form to the savable draft (maps onto the shared `WorkoutLog`). */
export function buildWorkoutLogDraft(form: WorkoutLogForm, recordedAt: string): WorkoutLogDraft {
  return {
    customWorkoutName: TYPE_LABEL[form.type],
    durationMinutes: form.durationMinutes,
    perceivedEffort: form.effort,
    exercises: [],
    countsAsResistance: form.countsAsResistance,
    recordedAt,
  };
}
