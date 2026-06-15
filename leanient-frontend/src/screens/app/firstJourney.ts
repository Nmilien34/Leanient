import type { GoalPace } from "@leanient/shared";

/**
 * FRONTEND-ONLY cold-start "mirror moment". A brand-new user has no score and no
 * history, so instead of a boring empty state we reflect back what they told us
 * at onboarding — their drug, their goal, their fear — and make the stakes vivid:
 * on a GLP-1, a big share of lost weight is usually muscle, and protecting it is
 * the whole job. Everything here is derived from the profile we already collected.
 */

export interface FirstJourneyView {
  /** "Mounjaro" or a generic fallback when no medication is set. */
  medLabel: string;
  /** Big stat anchor — the share of GLP-1 weight loss that's typically muscle. */
  stakeStat: string; // "25–40%"
  stakeCaption: string;
  /** One line tied to the user's biggest fear, so they feel understood. */
  fearLine: string;
  /** The path strip: where they start, where they're headed, by when. */
  startLabel: string | null; // "228 lb"
  goalLabel: string | null; // "180 lb"
  etaLabel: string | null; // "Sep 14"
  toGoLabel: string | null; // "48 lb to go"
  /** Closing promise + nudge into the first action. */
  promise: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Muscle-safe weekly loss rate per goal pace (lb/week). Mirrors the week plan. */
const PACE_LB_PER_WEEK: Record<GoalPace, number> = { gentle: 0.5, steady: 1.0, aggressive: 1.5 };

/**
 * Biggest-fear → a line that reflects it back and names what we do about it.
 * Falls back to the muscle story, which is the core promise.
 */
const FEAR_LINE: Record<string, string> = {
  losing_muscle: "You told us losing muscle is the worry. That's the exact thing we score every week.",
  ozempic_face: "You told us “Ozempic face” is the worry. The fix is upstream: protect the muscle and the fullness follows.",
  strength: "You told us losing strength is the worry. We tune the training to your shot week so you hold it.",
  energy: "You told us energy crashing is the worry. We plan around your shot cycle so the low days hit softer.",
  side_effects: "You told us side effects are the worry. We time protein and effort to your cycle so the rough days are easier.",
  confidence: "You told us you want to feel like yourself again. We track what actually protects how you look and feel.",
};

const DEFAULT_FEAR_LINE = "Most GLP-1 plans only watch the scale. We watch the muscle underneath it.";

export function buildFirstJourney(args: {
  medicationName?: string | null;
  currentWeight?: number | null;
  goalWeight?: number | null;
  goalWeightUnit?: string | null;
  goalPace?: GoalPace | null;
  biggestFear?: string | null;
  now: Date;
}): FirstJourneyView {
  const { medicationName, currentWeight, goalWeight, goalWeightUnit, goalPace, biggestFear, now } = args;
  const medLabel = medicationName?.trim() ? medicationName.trim() : "your GLP-1";
  const unit = goalWeightUnit ?? "lb";

  // Path strip — only when we have both endpoints and there's ground to cover.
  let startLabel: string | null = null;
  let goalLabel: string | null = null;
  let etaLabel: string | null = null;
  let toGoLabel: string | null = null;
  const toGo = currentWeight != null && goalWeight != null ? Math.round(currentWeight - goalWeight) : null;
  if (currentWeight != null && goalWeight != null && toGo != null && toGo > 0) {
    startLabel = `${Math.round(currentWeight)} ${unit}`;
    goalLabel = `${Math.round(goalWeight)} ${unit}`;
    toGoLabel = `${toGo} ${unit} to go`;
    const lbPerWeek = PACE_LB_PER_WEEK[goalPace ?? "steady"];
    if (lbPerWeek > 0) {
      const weeks = Math.ceil(toGo / lbPerWeek);
      const eta = new Date(now.getTime() + weeks * 7 * 86_400_000);
      etaLabel = `${MONTHS[eta.getMonth()]} ${eta.getDate()}`;
    }
  }

  return {
    medLabel,
    stakeStat: "25–40%",
    stakeCaption: `of the weight people lose on ${medLabel} is usually muscle, not fat.`,
    fearLine: (biggestFear && FEAR_LINE[biggestFear]) || DEFAULT_FEAR_LINE,
    startLabel,
    goalLabel,
    etaLabel,
    toGoLabel,
    promise: "Leanient's job is to keep that muscle yours. Log your first day below and your score starts building.",
  };
}
