import type { CreateWorkoutLogRequest, VerdictStatus, Workout } from "@leanient/shared";
import { fmtClock, type CompletedWorkout } from "./workoutSession";

/**
 * FRONTEND-ONLY display aggregate for the "Workout complete" screen (21). It
 * folds the just-finished session (from the player) into the week's training
 * context + the verdict, so the summary reflects what actually happened and
 * what it means for keeping muscle.
 *
 * "Protein on track" comes from the verdict status — the engine already weighs
 * protein adherence — rather than a raw mid-week ratio, which would read as
 * "behind" just because the week isn't over.
 */

export interface WorkoutCompleteView {
  headline: string; // "That's training locked in." | "Session logged."
  subtitle: string; // "Upper body · 22 min · logged to today"
  exercisesLabel: string; // "8 / 8"
  exercisesRatio: number;
  timeLabel: string; // actual elapsed, e.g. "21:40"
  sessions: { label: string; ratio: number }; // "3 / 3"
  weeklyTrainingLabel: string; // "3 of 3 done"
  weeklyTrainingRatio: number;
  coachLine: string;
  projectedVerdict: string; // "Keeping your muscle"
}

const NUMBER_WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numberWord = (n: number) => (n >= 0 && n < NUMBER_WORD.length ? NUMBER_WORD[n] : String(n));

/** Where this week's verdict is heading once today's session is counted. */
function projectVerdict(status: VerdictStatus, trainingHit: boolean): string {
  switch (status) {
    case "on_track":
      return "Keeping your muscle";
    case "drifting":
      return trainingHit ? "Keeping your muscle" : "Back on track";
    case "losing_muscle":
      return "Turning it around";
    case "no_data":
    default:
      return "Your first verdict";
  }
}

export function deriveWorkoutComplete(args: {
  summary: CompletedWorkout;
  trainingDone: number; // sessions logged this week before this one
  trainingTarget: number;
  verdictStatus: VerdictStatus;
}): WorkoutCompleteView {
  const { summary, trainingDone, trainingTarget, verdictStatus } = args;

  const finishedAll = summary.exercisesCompleted >= summary.exercisesTotal;
  const sessionsDone = Math.min(trainingDone + 1, trainingTarget || trainingDone + 1);
  const trainingHit = trainingTarget > 0 && sessionsDone >= trainingTarget;
  const proteinOnTrack = verdictStatus === "on_track";
  const projectedVerdict = projectVerdict(verdictStatus, trainingHit);
  const sessionsRatio = clamp01(trainingTarget ? sessionsDone / trainingTarget : 1);

  let coachLine: string;
  if (trainingHit && proteinOnTrack) {
    coachLine = `${cap(numberWord(sessionsDone))} sessions this week with protein on track. That's exactly the pattern that keeps muscle, so Sunday's verdict is shaping up to ${projectedVerdict}.`;
  } else if (trainingHit) {
    coachLine = `${cap(numberWord(sessionsDone))} sessions banked this week. Keep protein up and Sunday's verdict holds at ${projectedVerdict}.`;
  } else {
    const left = Math.max(0, trainingTarget - sessionsDone);
    coachLine = `Session logged. ${left === 1 ? "One" : cap(numberWord(left))} more this week and your muscle stays put.`;
  }

  return {
    headline: finishedAll ? "That's training locked in." : "Session logged.",
    subtitle: `${summary.title} · ${summary.durationMinutes} min · logged to today`,
    exercisesLabel: `${summary.exercisesCompleted} / ${summary.exercisesTotal}`,
    exercisesRatio: clamp01(summary.exercisesTotal ? summary.exercisesCompleted / summary.exercisesTotal : 0),
    timeLabel: fmtClock(summary.elapsedSeconds),
    sessions: { label: `${sessionsDone} / ${trainingTarget}`, ratio: sessionsRatio },
    weeklyTrainingLabel: `${sessionsDone} of ${trainingTarget} done`,
    weeklyTrainingRatio: sessionsRatio,
    coachLine,
    projectedVerdict,
  };
}

/**
 * Pull a usable positive integer rep count from a catalog reps string like
 * "8-12", "10", "12 each side", or "30 sec". Ranges use the upper target.
 * Falls back to 10 when there is no number (e.g. "AMRAP").
 */
function parsePrescribedReps(reps: string): number {
  const found = (reps.match(/\d+/g) ?? []).map((n) => parseInt(n, 10)).filter((n) => n > 0);
  if (found.length === 0) return 10;
  return found.length === 1 ? found[0] : found[1];
}

/**
 * Capture the session's exercise composition from the catalog workout so each
 * logged workout carries what was actually trained (names, muscle groups, the
 * prescribed set/rep structure). Weights are left null: the guided player does
 * not measure load, so we record the plan the user followed, not invented data.
 * This is what lets the coach and the history view reference real exercises.
 */
export function buildGuidedWorkoutLogDraft(args: {
  summary: CompletedWorkout;
  workout: Workout;
  recordedAt: string;
}): CreateWorkoutLogRequest {
  const durationMinutes = Math.max(1, Math.round(args.summary.elapsedSeconds / 60));

  const exercises: CreateWorkoutLogRequest["exercises"] = (args.workout.exercises ?? []).map((ex) => {
    const setCount = Math.max(1, ex.sets);
    const reps = parsePrescribedReps(ex.reps);
    return {
      name: ex.name,
      muscleGroups: ex.muscleGroups,
      sets: Array.from({ length: setCount }, () => ({ reps, weight: null, unit: null })),
    };
  });

  return {
    workoutId: args.summary.workoutId,
    durationMinutes,
    exercises,
    countsAsResistance: args.workout.category === "strength",
    recordedAt: args.recordedAt,
  };
}
