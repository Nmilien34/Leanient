import { describe, expect, it } from "vitest";
import { completedExerciseCount, initSession, selectView, sessionReducer, type SessionAction, type SessionState } from "../../screens/app/workoutSession";
import { mockRecommendedWorkout as W } from "../../mocks/workouts";

const step = (state: SessionState, action: SessionAction) => sessionReducer(state, action, W);

describe("workoutSession reducer", () => {
  it("starts on the first set of the first exercise, active", () => {
    expect(initSession()).toEqual({ exerciseIndex: 0, set: 1, phase: "active", restRemaining: 0 });
  });

  it("DONE starts a rest using the exercise's restSeconds", () => {
    const s = step(initSession(), { type: "DONE" });
    expect(s.phase).toBe("resting");
    expect(s.restRemaining).toBe(W.exercises[0].restSeconds); // 45
  });

  it("SKIP_REST advances to the next set within the exercise", () => {
    let s = step(initSession(), { type: "DONE" });
    s = step(s, { type: "SKIP_REST" });
    expect(s).toMatchObject({ exerciseIndex: 0, set: 2, phase: "active" });
  });

  it("rolls into the next exercise after the last set", () => {
    let s: SessionState = { exerciseIndex: 0, set: 3, phase: "active", restRemaining: 0 };
    s = step(s, { type: "DONE" }); // last set of ex 0 → rest
    expect(s.phase).toBe("resting");
    s = step(s, { type: "SKIP_REST" });
    expect(s).toMatchObject({ exerciseIndex: 1, set: 1, phase: "active" });
  });

  it("TICK counts down and auto-advances at zero", () => {
    let s = step(initSession(), { type: "DONE" }); // resting at 45
    for (let i = 0; i < 44; i++) s = step(s, { type: "TICK" });
    expect(s).toMatchObject({ phase: "resting", restRemaining: 1 });
    s = step(s, { type: "TICK" }); // 1 → 0 → advance
    expect(s).toMatchObject({ exerciseIndex: 0, set: 2, phase: "active" });
  });

  it("ADD_REST adds 20 seconds", () => {
    let s = step(initSession(), { type: "DONE" });
    s = step(s, { type: "ADD_REST" });
    expect(s.restRemaining).toBe(W.exercises[0].restSeconds + 20);
  });

  it("completes after the last set of the last exercise", () => {
    let s = initSession();
    const totalSets = W.exercises.reduce((n, e) => n + e.sets, 0); // 8 × 3 = 24
    for (let i = 0; i < totalSets; i++) {
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
  it("renders the active state from the workout", () => {
    const v = selectView(initSession(), W);
    expect(v.headerTitle).toBe("Upper body · 22 min");
    expect(v.progressLabel).toBe("1 / 8");
    expect(v.current.eyebrow).toBe("EXERCISE 1 · SET 1 OF 3");
    expect(v.current.name).toBe("Dumbbell floor press");
    expect(v.current.reps).toBe("10 reps");
    expect(v.current.cue).toBe(W.exercises[0].notes);
    expect(v.nextUp).toEqual({ label: "NEXT UP", text: "Bent-over row · 3 × 10" });
    expect(v.isFinalSet).toBe(false);
  });

  it("renders the rest state with a clock and the immediate next set", () => {
    const s = step(initSession(), { type: "DONE" });
    const v = selectView(s, W);
    expect(v.phase).toBe("resting");
    expect(v.restLabel).toBe("0:45");
    expect(v.nextUp).toEqual({ label: "UP NEXT · SET 2 OF 3", text: "Dumbbell floor press · 10 reps" });
  });

  it("flags the final set and hides next-up on the last exercise", () => {
    const v = selectView({ exerciseIndex: 7, set: 3, phase: "active", restRemaining: 0 }, W);
    expect(v.isFinalSet).toBe(true);
    expect(v.nextUp).toBeNull();
    expect(v.progressLabel).toBe("8 / 8");
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
