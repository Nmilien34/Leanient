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

/** Biggest-fear → the step that most directly addresses it (leads the list). */
const FEAR_ANCHOR: Record<string, GettingStartedKey> = {
  losing_muscle: "workout",
  strength: "workout",
  ozempic_face: "meal",
  energy: "meal",
  side_effects: "meal",
  confidence: "weight",
};

/** A hint for the anchor step that names the fear, so the first action feels chosen for them. */
const FEAR_ANCHOR_HINT: Record<string, string> = {
  losing_muscle: "Resistance training is your muscle's first defense",
  strength: "Strength holds when you keep training through the cycle",
  ozempic_face: "Protein protects the fullness in your face",
  energy: "Protein steadies your energy across the shot cycle",
  side_effects: "Small, protein-first bites are easiest on rough days",
  confidence: "Your starting point — the change you'll feel",
};

export function buildGettingStarted(args: {
  /** True once the engine has produced a retention score; then no guide is needed. */
  hasScore: boolean;
  weightLogged: boolean;
  mealLoggedToday: boolean;
  workoutDoneToday: boolean;
  /** Reorders the list so the step tied to this fear leads. */
  biggestFear?: string | null;
}): GettingStartedView | null {
  if (args.hasScore) return null;

  const byKey: Record<GettingStartedKey, GettingStartedStep> = {
    weight: { key: "weight", label: "Log your weight", hint: "Your starting point to measure from", done: args.weightLogged },
    meal: { key: "meal", label: "Log a protein meal", hint: "Protein is what protects muscle", done: args.mealLoggedToday },
    workout: { key: "workout", label: "Finish a workout", hint: "Resistance training defends lean mass", done: args.workoutDoneToday },
  };

  // Lead with the fear's anchor (and give it a fear-specific hint); keep the rest
  // in their natural order. No/unknown fear keeps the default weight → meal → workout.
  const anchor: GettingStartedKey = (args.biggestFear ? FEAR_ANCHOR[args.biggestFear] : undefined) ?? "weight";
  if (args.biggestFear && FEAR_ANCHOR_HINT[args.biggestFear]) {
    byKey[anchor] = { ...byKey[anchor], hint: FEAR_ANCHOR_HINT[args.biggestFear] };
  }
  const order: GettingStartedKey[] = ["weight", "meal", "workout"];
  const steps: GettingStartedStep[] = [anchor, ...order.filter((k) => k !== anchor)].map((k) => byKey[k]);

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
