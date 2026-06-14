/**
 * FRONTEND-ONLY first-run guide. A brand-new user has no muscle-retention score
 * yet, and an empty top-of-screen is confusing ("why is there nothing, what do I
 * do?"). This replaces the score card with a short checklist that explains why
 * the score isn't there and points at the exact actions that generate the data
 * the engine needs.
 */

export type GettingStartedKey = "weight" | "meal" | "workout";

export interface GettingStartedStep {
  key: GettingStartedKey;
  label: string;
  hint: string;
  done: boolean;
}

export interface GettingStartedView {
  steps: GettingStartedStep[];
  doneCount: number;
  totalCount: number;
  allDone: boolean;
  headline: string;
  why: string;
}

export function buildGettingStarted(args: {
  /** True once the engine has produced a retention score; then no guide is needed. */
  hasScore: boolean;
  weightLogged: boolean;
  mealLoggedToday: boolean;
  workoutDoneToday: boolean;
}): GettingStartedView | null {
  if (args.hasScore) return null;

  const steps: GettingStartedStep[] = [
    { key: "weight", label: "Log your weight", hint: "Your starting point to measure from", done: args.weightLogged },
    { key: "meal", label: "Log a protein meal", hint: "Protein is what protects muscle", done: args.mealLoggedToday },
    { key: "workout", label: "Finish a workout", hint: "Resistance training defends lean mass", done: args.workoutDoneToday },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return {
    steps,
    doneCount,
    totalCount: steps.length,
    allDone,
    headline: allDone ? "Your first data is in" : "Your muscle score is on its way",
    why: allDone
      ? "Keep this rhythm through the week. Your first muscle-retention score lands at your weekly check-in."
      : "Your retention score and verdict show up once Leanient has your first days of data. Knock these out and your first read lands at your weekly check-in.",
  };
}
