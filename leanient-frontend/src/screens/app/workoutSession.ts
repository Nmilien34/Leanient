import type { Workout } from "@leanient/shared";

/**
 * Pure state machine for the in-session workout player (screen 19 + its rest
 * state, screen 20). Keeping it pure and contract-driven means the player UI
 * stays presentational and every transition is unit-testable:
 *
 *   active --DONE--> resting --(TICK to 0 | SKIP_REST)--> active (next set/exercise)
 *   active --DONE (last set, last exercise)--> complete
 *   any   --END--> complete
 *
 * The session walks the workout's `exercises[]` (each with `sets`), resting for
 * `restSeconds` between sets. Nothing here is hardcoded to a specific workout.
 */

export type SessionPhase = "active" | "resting" | "complete";

export interface SessionState {
  exerciseIndex: number; // 0-based index into workout.exercises
  set: number; // 1-based current set within the exercise
  phase: SessionPhase;
  restRemaining: number; // seconds left when resting
}

export type SessionAction =
  | { type: "RESET" }
  | { type: "DONE" } // finished the current set
  | { type: "TICK" } // one second of rest elapsed
  | { type: "ADD_REST" } // "+20s"
  | { type: "SKIP_REST" }
  | { type: "END" }; // end the workout now

const REST_BUMP_SECONDS = 20;

export function initSession(): SessionState {
  return { exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0 };
}

/** Move to the next set, or next exercise, or complete — the shared advance. */
function advance(state: SessionState, workout: Workout): SessionState {
  const exercise = workout.exercises[state.exerciseIndex];
  if (state.set < exercise.sets) {
    return { exerciseIndex: state.exerciseIndex, set: state.set + 1, phase: "active", restRemaining: 0 };
  }
  if (state.exerciseIndex + 1 < workout.exercises.length) {
    return { exerciseIndex: state.exerciseIndex + 1, set: 1, phase: "active", restRemaining: 0 };
  }
  return { ...state, phase: "complete", restRemaining: 0 };
}

export function sessionReducer(state: SessionState, action: SessionAction, workout: Workout): SessionState {
  if (action.type === "RESET") return initSession();
  if (action.type === "END") return { ...state, phase: "complete", restRemaining: 0 };
  if (state.phase === "complete") return state;

  const exercise = workout.exercises[state.exerciseIndex];

  switch (action.type) {
    case "DONE": {
      if (state.phase !== "active") return state;
      const isLastSet = state.set >= exercise.sets;
      const isLastExercise = state.exerciseIndex + 1 >= workout.exercises.length;
      if (isLastSet && isLastExercise) return { ...state, phase: "complete", restRemaining: 0 };
      return { ...state, phase: "resting", restRemaining: exercise.restSeconds };
    }
    case "TICK": {
      if (state.phase !== "resting") return state;
      if (state.restRemaining <= 1) return advance(state, workout);
      return { ...state, restRemaining: state.restRemaining - 1 };
    }
    case "ADD_REST":
      if (state.phase !== "resting") return state;
      return { ...state, restRemaining: state.restRemaining + REST_BUMP_SECONDS };
    case "SKIP_REST":
      if (state.phase !== "resting") return state;
      return advance(state, workout);
    default:
      return state;
  }
}

// ---- view selectors -------------------------------------------------------

export interface SessionView {
  headerTitle: string; // "Upper body · 22 min"
  progressLabel: string; // "3 / 8"
  total: number;
  exerciseIndex: number;
  phase: SessionPhase;
  isFinalSet: boolean; // last set of the last exercise (CTA copy)
  current: { name: string; eyebrow: string; reps: string; cue: string | null };
  nextUp: { label: string; text: string } | null;
  restLabel: string; // "0:32"
}

export function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** How many exercises were fully completed at the moment the session ended. */
export function completedExerciseCount(state: SessionState, workout: Workout): number {
  const exercise = workout.exercises[state.exerciseIndex];
  if (!exercise) return workout.exercises.length;
  const finishedCurrent = state.set >= exercise.sets;
  return Math.min(workout.exercises.length, state.exerciseIndex + (finishedCurrent ? 1 : 0));
}

/** Summary handed to the completion screen (21) when the session ends. */
export interface CompletedWorkout {
  workoutId: string;
  title: string;
  durationMinutes: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  elapsedSeconds: number;
}

export function selectView(state: SessionState, workout: Workout): SessionView {
  const total = workout.exercises.length;
  const exercise = workout.exercises[state.exerciseIndex];
  const headerTitle = `${workout.title} · ${workout.durationMinutes} min`;

  if (!exercise) {
    return {
      headerTitle,
      progressLabel: `0 / ${total}`,
      total,
      exerciseIndex: state.exerciseIndex,
      phase: state.phase,
      isFinalSet: true,
      current: { name: "", eyebrow: "", reps: "", cue: null },
      nextUp: null,
      restLabel: "0:00",
    };
  }

  const isFinalSet = state.set >= exercise.sets && state.exerciseIndex + 1 >= total;
  const nextExercise = workout.exercises[state.exerciseIndex + 1];

  // Active: preview the next exercise. Resting: the immediate next set/exercise.
  let nextUp: SessionView["nextUp"] = null;
  if (state.phase === "active") {
    if (nextExercise) {
      nextUp = { label: "NEXT UP", text: `${nextExercise.name} · ${nextExercise.sets} × ${nextExercise.reps}` };
    }
  } else if (state.phase === "resting") {
    if (state.set < exercise.sets) {
      nextUp = { label: `UP NEXT · SET ${state.set + 1} OF ${exercise.sets}`, text: `${exercise.name} · ${exercise.reps} reps` };
    } else if (nextExercise) {
      nextUp = { label: `UP NEXT · SET 1 OF ${nextExercise.sets}`, text: `${nextExercise.name} · ${nextExercise.reps} reps` };
    }
  }

  return {
    headerTitle,
    progressLabel: `${state.exerciseIndex + 1} / ${total}`,
    total,
    exerciseIndex: state.exerciseIndex,
    phase: state.phase,
    isFinalSet,
    current: {
      name: exercise.name,
      eyebrow: `EXERCISE ${state.exerciseIndex + 1} · SET ${state.set} OF ${exercise.sets}`,
      reps: `${exercise.reps} reps`,
      cue: exercise.notes,
    },
    nextUp,
    restLabel: fmtClock(state.restRemaining),
  };
}
