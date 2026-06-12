import { describe, expect, it } from "vitest";
import type { Workout } from "@leanient/shared";
import { buildGuidedWorkoutLogDraft, deriveWorkoutComplete } from "../../screens/app/workoutCompleteMetrics";
import type { CompletedWorkout } from "../../screens/app/workoutSession";

const fullSession: CompletedWorkout = {
  workoutId: "workout_1",
  title: "Upper body",
  durationMinutes: 22,
  exercisesCompleted: 8,
  exercisesTotal: 8,
  elapsedSeconds: 1300, // 21:40
};

describe("deriveWorkoutComplete", () => {
  it("summarizes a finished session and projects the verdict (on track)", () => {
    const v = deriveWorkoutComplete({ summary: fullSession, trainingDone: 2, trainingTarget: 3, verdictStatus: "on_track" });
    expect(v.headline).toBe("That's training locked in.");
    expect(v.subtitle).toBe("Upper body · 22 min · logged to today");
    expect(v.exercisesLabel).toBe("8 / 8");
    expect(v.exercisesRatio).toBe(1);
    expect(v.timeLabel).toBe("21:40");
    expect(v.sessions).toEqual({ label: "3 / 3", ratio: 1 });
    expect(v.weeklyTrainingLabel).toBe("3 of 3 done");
    expect(v.projectedVerdict).toBe("Keeping your muscle");
    expect(v.coachLine).toBe(
      "Three sessions this week with protein on track. That's exactly the pattern that keeps muscle, so Sunday's verdict is shaping up to Keeping your muscle.",
    );
  });

  it("reads completed exercises and uses 'Session logged' when ended early", () => {
    const v = deriveWorkoutComplete({
      summary: { ...fullSession, exercisesCompleted: 3 },
      trainingDone: 2,
      trainingTarget: 3,
      verdictStatus: "on_track",
    });
    expect(v.headline).toBe("Session logged.");
    expect(v.exercisesLabel).toBe("3 / 8");
  });

  it("drops the 'protein on track' clause when the verdict isn't on track", () => {
    const v = deriveWorkoutComplete({ summary: fullSession, trainingDone: 2, trainingTarget: 3, verdictStatus: "drifting" });
    expect(v.coachLine).toBe("Three sessions banked this week. Keep protein up and Sunday's verdict holds at Keeping your muscle.");
    expect(v.projectedVerdict).toBe("Keeping your muscle");
  });

  it("counts remaining sessions when the weekly target isn't hit yet", () => {
    const v = deriveWorkoutComplete({ summary: fullSession, trainingDone: 0, trainingTarget: 3, verdictStatus: "losing_muscle" });
    expect(v.sessions.label).toBe("1 / 3");
    expect(v.coachLine).toBe("Session logged. Two more this week and your muscle stays put.");
  });

  it("builds the guided workout log only when the user confirms completion", () => {
    const workout = {
      id: "workout_1",
      category: "strength",
    } as Workout;

    expect(
      buildGuidedWorkoutLogDraft({
        summary: { ...fullSession, elapsedSeconds: 32 },
        workout,
        recordedAt: "2026-06-03T18:00:00.000Z",
      }),
    ).toEqual({
      workoutId: "workout_1",
      durationMinutes: 1,
      exercises: [],
      countsAsResistance: true,
      recordedAt: "2026-06-03T18:00:00.000Z",
    });
  });

  it("captures the catalog exercise composition into the log", () => {
    const workout = {
      id: "workout_2",
      category: "strength",
      exercises: [
        { name: "Goblet Squat", sets: 3, reps: "8-12", restSeconds: 60, muscleGroups: ["legs"], notes: null },
        { name: "Plank", sets: 1, reps: "30 sec", restSeconds: 30, muscleGroups: ["core"], notes: null },
      ],
    } as Workout;

    const draft = buildGuidedWorkoutLogDraft({
      summary: { ...fullSession, elapsedSeconds: 1320 },
      workout,
      recordedAt: "2026-06-03T18:00:00.000Z",
    });

    expect(draft.exercises).toEqual([
      {
        name: "Goblet Squat",
        muscleGroups: ["legs"],
        // "8-12" range uses the upper target; weights are not measured by the player.
        sets: [
          { reps: 12, weight: null, unit: null },
          { reps: 12, weight: null, unit: null },
          { reps: 12, weight: null, unit: null },
        ],
      },
      {
        name: "Plank",
        muscleGroups: ["core"],
        sets: [{ reps: 30, weight: null, unit: null }],
      },
    ]);
  });

  it("carries the post-workout feel into the log when provided", () => {
    const workout = { id: "workout_1", category: "strength", exercises: [] } as unknown as Workout;

    const withFeel = buildGuidedWorkoutLogDraft({
      summary: fullSession,
      workout,
      recordedAt: "2026-06-03T18:00:00.000Z",
      feel: { effort: "hard", note: "Last set of squats was a grind." },
    });
    expect(withFeel.perceivedEffort).toBe("hard");
    expect(withFeel.notes).toBe("Last set of squats was a grind.");

    const noFeel = buildGuidedWorkoutLogDraft({
      summary: fullSession,
      workout,
      recordedAt: "2026-06-03T18:00:00.000Z",
    });
    expect(noFeel.perceivedEffort).toBeUndefined();
    expect(noFeel.notes).toBeUndefined();
  });
});
