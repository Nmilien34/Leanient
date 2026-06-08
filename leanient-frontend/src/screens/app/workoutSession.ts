import type { Workout } from "@leanient/shared";

/**
 * Pure state machine for the in-session workout player (screen 19 + its rest
 * state, screen 20). Keeping it pure and contract-driven means the player UI
 * stays presentational and every transition is unit-testable:
 *
 *   ready --START--> active --(TICK to 0 | DONE)--> resting --(TICK to 0 | SKIP_REST)--> ready (next exercise)
 *   active --(TICK to 0 | DONE, last exercise)--> complete
 *   any   --END--> complete
 *
 * The session walks the workout's `exercises[]`, resting between exercises.
 * The set count is presented as exercise detail, while completion happens once
 * per exercise so the top progress segments match the visible 1/N workout count.
 */

export type SessionPhase = "ready" | "active" | "resting" | "complete";

export interface SessionState {
  exerciseIndex: number; // 0-based index into workout.exercises
  set: number; // 1-based display marker; completed exercises store their full set count
  phase: SessionPhase;
  restRemaining: number; // seconds left when resting
  exerciseRemaining: number; // seconds left when the exercise timer is active
}

export type SessionAction =
  | { type: "RESET" }
  | { type: "START" } // starts the current exercise timer after the hold gesture
  | { type: "DONE" } // finished the current exercise
  | { type: "TICK" } // one second elapsed for the active exercise or rest timer
  | { type: "ADD_REST" } // "+20s"
  | { type: "SKIP_REST" }
  | { type: "END" }; // end the workout now

const REST_BUMP_SECONDS = 20;

export function initSession(): SessionState {
  return { exerciseIndex: 0, set: 1, phase: "ready", restRemaining: 0, exerciseRemaining: 0 };
}

/** Move to the next exercise, or complete — the shared advance. */
function advance(state: SessionState, workout: Workout): SessionState {
  if (state.exerciseIndex + 1 < workout.exercises.length) {
    return { exerciseIndex: state.exerciseIndex + 1, set: 1, phase: "ready", restRemaining: 0, exerciseRemaining: 0 };
  }
  return { ...state, phase: "complete", restRemaining: 0, exerciseRemaining: 0 };
}

function restAfterCurrentExercise(state: SessionState, workout: Workout): SessionState {
  const exercise = workout.exercises[state.exerciseIndex];
  const completedSet = Math.max(1, exercise.sets);
  const isLastExercise = state.exerciseIndex + 1 >= workout.exercises.length;
  if (isLastExercise) {
    return { ...state, set: completedSet, phase: "complete", restRemaining: 0, exerciseRemaining: 0 };
  }
  return {
    ...state,
    set: completedSet,
    phase: "resting",
    restRemaining: exercise.restSeconds,
    exerciseRemaining: 0,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction, workout: Workout): SessionState {
  if (action.type === "RESET") return initSession();
  if (action.type === "END") return { ...state, phase: "complete", restRemaining: 0, exerciseRemaining: 0 };
  if (state.phase === "complete") return state;

  switch (action.type) {
    case "START":
      if (state.phase !== "ready") return state;
      return {
        ...state,
        phase: "active",
        restRemaining: 0,
        exerciseRemaining: exerciseDurationSeconds(workout, state.exerciseIndex),
      };
    case "DONE": {
      if (state.phase !== "ready" && state.phase !== "active") return state;
      return restAfterCurrentExercise(state, workout);
    }
    case "TICK": {
      if (state.phase === "active") {
        if (state.exerciseRemaining <= 1) return restAfterCurrentExercise(state, workout);
        return { ...state, exerciseRemaining: state.exerciseRemaining - 1 };
      }
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
  isFinalSet: boolean; // last exercise (CTA copy)
  current: { name: string; eyebrow: string; reps: string; cue: string | null; muscleGroups: string[] };
  nextUp: { label: string; text: string } | null;
  restLabel: string; // "0:32"
  exerciseLabel: string; // "1:41"
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

export function exerciseDurationSeconds(workout: Workout, exerciseIndex: number): number {
  if (!workout.exercises[exerciseIndex]) return 0;
  const totalSessionSeconds = workout.durationMinutes * 60;
  const plannedRestSeconds = workout.exercises
    .slice(0, Math.max(0, workout.exercises.length - 1))
    .reduce((total, exercise) => total + exercise.restSeconds, 0);
  const activeSessionSeconds = Math.max(workout.exercises.length * 10, totalSessionSeconds - plannedRestSeconds);

  return Math.max(10, Math.round(activeSessionSeconds / workout.exercises.length));
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Per-exercise top-bar fill. Prior exercises are full, future exercises are
 * empty, and the active exercise fills from the visible exercise countdown.
 */
export function selectExerciseSegmentFills(
  state: SessionState,
  workout: Workout,
): number[] {
  const completedCount =
    state.phase === "complete" ? completedExerciseCount(state, workout) : state.exerciseIndex;

  return workout.exercises.map((exercise, index) => {
    if (index < completedCount) return 1;
    if (index > state.exerciseIndex || state.phase === "complete") return 0;

    if (state.phase === "resting") {
      return 1;
    }

    if (state.phase === "active") {
      const duration = exerciseDurationSeconds(workout, index);
      if (duration <= 0) return 0;
      const progress = 1 - state.exerciseRemaining / duration;
      return Math.round(clamp01(progress) * 100) / 100;
    }

    return 0;
  });
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
      current: { name: "", eyebrow: "", reps: "", cue: null, muscleGroups: [] },
      nextUp: null,
      restLabel: "0:00",
      exerciseLabel: "0:00",
    };
  }

  const isFinalSet = state.exerciseIndex + 1 >= total;
  const nextExercise = workout.exercises[state.exerciseIndex + 1];

  // Active: preview the next exercise. Resting: the immediate next exercise.
  let nextUp: SessionView["nextUp"] = null;
  if (state.phase === "ready" || state.phase === "active") {
    if (nextExercise) {
      nextUp = { label: "NEXT UP", text: `${nextExercise.name} · ${nextExercise.sets} × ${nextExercise.reps}` };
    }
  } else if (state.phase === "resting") {
    if (nextExercise) {
      nextUp = { label: `UP NEXT · EXERCISE ${state.exerciseIndex + 2} OF ${total}`, text: `${nextExercise.name} · ${nextExercise.sets} × ${nextExercise.reps}` };
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
      eyebrow: `EXERCISE ${state.exerciseIndex + 1} OF ${total}`,
      reps: `${exercise.sets} sets · ${exercise.reps}`,
      cue: exercise.notes,
      muscleGroups: exercise.muscleGroups,
    },
    nextUp,
    restLabel: fmtClock(state.restRemaining),
    exerciseLabel: fmtClock(
      state.phase === "active" && state.exerciseRemaining > 0
        ? state.exerciseRemaining
        : exerciseDurationSeconds(workout, state.exerciseIndex),
    ),
  };
}
