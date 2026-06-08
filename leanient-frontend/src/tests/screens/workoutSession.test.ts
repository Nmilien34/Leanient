import { describe, expect, it } from "vitest";
import {
  completedExerciseCount,
  exerciseDurationSeconds,
  initSession,
  selectExerciseSegmentFills,
  selectView,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from "../../screens/app/workoutSession";
import { mockRecommendedWorkout as W } from "../../mocks/workouts";

const step = (state: SessionState, action: SessionAction) => sessionReducer(state, action, W);

describe("workoutSession reducer", () => {
  it("starts on the first exercise, ready for the user to hold-to-start", () => {
    expect(initSession()).toEqual({ exerciseIndex: 0, set: 1, phase: "ready", restRemaining: 0, exerciseRemaining: 0 });
  });

  it("START begins the current exercise countdown", () => {
    const s = step(initSession(), { type: "START" });
    expect(s).toEqual({
      exerciseIndex: 0,
      set: 1,
      phase: "active",
      restRemaining: 0,
      exerciseRemaining: exerciseDurationSeconds(W, 0),
    });
  });

  it("TICK counts down the active exercise and starts rest when the timer finishes", () => {
    let s = step(initSession(), { type: "START" });
    const duration = exerciseDurationSeconds(W, 0);
    for (let i = 0; i < duration - 1; i++) s = step(s, { type: "TICK" });
    expect(s).toMatchObject({ phase: "active", exerciseRemaining: 1 });
    s = step(s, { type: "TICK" });
    expect(s.phase).toBe("resting");
    expect(s.set).toBe(W.exercises[0].sets);
    expect(s.restRemaining).toBe(W.exercises[0].restSeconds); // 45
    expect(s.exerciseRemaining).toBe(0);
  });

  it("SKIP_REST advances to the next exercise", () => {
    let s = step(initSession(), { type: "DONE" });
    s = step(s, { type: "SKIP_REST" });
    expect(s).toMatchObject({ exerciseIndex: 1, set: 1, phase: "ready", exerciseRemaining: 0 });
  });

  it("rolls into the next exercise after resting", () => {
    let s: SessionState = { exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0 };
    s = step(s, { type: "DONE" }); // exercise 0 → rest
    expect(s.phase).toBe("resting");
    s = step(s, { type: "SKIP_REST" });
    expect(s).toMatchObject({ exerciseIndex: 1, set: 1, phase: "ready", exerciseRemaining: 0 });
  });

  it("TICK counts down rest and auto-advances at zero", () => {
    let s = step(initSession(), { type: "DONE" }); // resting at 45
    for (let i = 0; i < 44; i++) s = step(s, { type: "TICK" });
    expect(s).toMatchObject({ phase: "resting", restRemaining: 1 });
    s = step(s, { type: "TICK" }); // 1 → 0 → advance
    expect(s).toMatchObject({ exerciseIndex: 1, set: 1, phase: "ready", exerciseRemaining: 0 });
  });

  it("ADD_REST adds 20 seconds", () => {
    let s = step(initSession(), { type: "DONE" });
    s = step(s, { type: "ADD_REST" });
    expect(s.restRemaining).toBe(W.exercises[0].restSeconds + 20);
  });

  it("completes after the last exercise", () => {
    let s = initSession();
    for (let i = 0; i < W.exercises.length; i++) {
      s = step(s, { type: "DONE" });
      if (s.phase === "resting") s = step(s, { type: "SKIP_REST" });
    }
    expect(s.phase).toBe("complete");
    expect(s.exerciseIndex).toBe(W.exercises.length - 1);
  });

  it("END completes from anywhere", () => {
    expect(step(initSession(), { type: "END" }).phase).toBe("complete");
    expect(step({ exerciseIndex: 4, set: 2, phase: "resting", restRemaining: 12 }, { type: "END" }).phase).toBe("complete");
  });
});

describe("workoutSession selectView", () => {
  it("renders the ready state from the workout", () => {
    const v = selectView(initSession(), W);
    expect(v.headerTitle).toBe("Upper body · 22 min");
    expect(v.progressLabel).toBe("1 / 8");
    expect(v.current.eyebrow).toBe("EXERCISE 1 OF 8");
    expect(v.current.name).toBe("Dumbbell floor press");
    expect(v.current.reps).toBe("3 sets · 10");
    expect(v.current.cue).toBe(W.exercises[0].notes);
    expect(v.nextUp).toEqual({ label: "NEXT UP", text: "Bent-over row · 3 × 10" });
    expect(v.isFinalSet).toBe(false);
  });

  it("renders the active exercise countdown", () => {
    const duration = exerciseDurationSeconds(W, 0);
    const v = selectView({ exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0, exerciseRemaining: duration - 30 }, W);
    expect(v.phase).toBe("active");
    expect(v.exerciseLabel).toBe("1:41");
  });

  it("renders the rest state with a clock and the immediate next exercise", () => {
    const s = step(initSession(), { type: "DONE" });
    const v = selectView(s, W);
    expect(v.phase).toBe("resting");
    expect(v.restLabel).toBe("0:45");
    expect(v.nextUp).toEqual({ label: "UP NEXT · EXERCISE 2 OF 8", text: "Bent-over row · 3 × 10" });
  });

  it("flags the final exercise and hides next-up on the last exercise", () => {
    const v = selectView({ exerciseIndex: 7, set: 3, phase: "ready", restRemaining: 0, exerciseRemaining: 0 }, W);
    expect(v.isFinalSet).toBe(true);
    expect(v.nextUp).toBeNull();
    expect(v.progressLabel).toBe("8 / 8");
  });
});

describe("workoutSession exercise segment fills", () => {
  it("keeps the current segment empty until the exercise countdown starts", () => {
    expect(selectExerciseSegmentFills(initSession(), W).slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("fills the active exercise segment from the countdown progress", () => {
    const duration = exerciseDurationSeconds(W, 0);
    expect(selectExerciseSegmentFills({ exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0, exerciseRemaining: duration }, W).slice(0, 3)).toEqual([0, 0, 0]);
    expect(selectExerciseSegmentFills({ exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0, exerciseRemaining: Math.round(duration / 2) }, W).slice(0, 3)).toEqual([0.5, 0, 0]);
    expect(selectExerciseSegmentFills({ exerciseIndex: 0, set: W.exercises[0].sets, phase: "resting", restRemaining: 45, exerciseRemaining: 0 }, W).slice(0, 3)).toEqual([1, 0, 0]);
  });

  it("keeps the completed exercise full through rest", () => {
    const resting = step(initSession(), { type: "DONE" });
    expect(selectExerciseSegmentFills(resting, W).slice(0, 3)).toEqual([1, 0, 0]);
  });

  it("marks prior exercises full and starts the next exercise segment at zero", () => {
    const nextExercise: SessionState = { exerciseIndex: 1, set: 1, phase: "ready", restRemaining: 0, exerciseRemaining: 0 };
    const activeNextExercise: SessionState = {
      exerciseIndex: 1,
      set: 1,
      phase: "active",
      restRemaining: 0,
      exerciseRemaining: 0,
    };
    expect(selectExerciseSegmentFills(nextExercise, W).slice(0, 3)).toEqual([1, 0, 0]);
    expect(selectExerciseSegmentFills(activeNextExercise, W).slice(0, 3)).toEqual([1, 1, 0]);
  });
});

describe("completedExerciseCount", () => {
  it("counts all exercises after a natural finish", () => {
    const finished: SessionState = { exerciseIndex: 7, set: 3, phase: "complete", restRemaining: 0 };
    expect(completedExerciseCount(finished, W)).toBe(8);
  });

  it("counts only fully-finished exercises when ended early mid-exercise", () => {
    const endedMid: SessionState = { exerciseIndex: 3, set: 1, phase: "complete", restRemaining: 0 };
    expect(completedExerciseCount(endedMid, W)).toBe(3);
  });
});
