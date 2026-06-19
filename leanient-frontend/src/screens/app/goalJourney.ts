import type { GoalPace, UserProfile, WeightLog } from "@leanient/shared";

/**
 * The "journey to goal" view for Progress: where the user started, where they
 * are now, and how far to their goal weight — paced by the speed they chose at
 * onboarding (gentle / steady / faster). Drives a track with a walking marker
 * moving toward the finish, plus the difference since they started and an ETA at
 * their chosen pace. Deterministic and testable.
 */

const PACE_LB_PER_WEEK: Record<GoalPace, number> = { gentle: 0.5, steady: 1.0, aggressive: 1.5 };
const PACE_LABEL: Record<GoalPace, string> = { gentle: "gentle", steady: "steady", aggressive: "faster" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface GoalJourneyView {
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  unit: string;
  /** Signed change since the first weigh-in: positive = lost, negative = gained. */
  changeLb: number;
  /** Fraction of the start→goal distance covered, 0–1 (drives the marker). */
  progress: number;
  pct: number;
  reached: boolean;
  paceLabel: string;
  lbPerWeek: number;
  /** Headline difference, e.g. "Down 12.0 lb" / "Up 1.4 lb" / "At your goal". */
  headline: string;
  /** Pace + ETA line, e.g. "68% there · at your steady pace, goal by Aug 12". */
  caption: string;
}

export function buildGoalJourney(args: {
  weightLogs: WeightLog[];
  profile: Pick<UserProfile, "goalWeight" | "goalWeightUnit" | "goalPace"> | null | undefined;
  now: Date;
}): GoalJourneyView | null {
  const { weightLogs, profile, now } = args;
  if (!profile || weightLogs.length === 0) return null;

  const sorted = [...weightLogs].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const startWeight = sorted[0].value;
  const currentWeight = sorted[sorted.length - 1].value;
  const goalWeight = profile.goalWeight;
  const unit = sorted[sorted.length - 1].unit ?? profile.goalWeightUnit;

  const changeLb = startWeight - currentWeight; // + lost, - gained
  const reached = currentWeight <= goalWeight;
  const totalDistance = startWeight - goalWeight; // full journey, >0 when goal is below start
  const progress = reached ? 1 : totalDistance > 0 ? clamp((startWeight - currentWeight) / totalDistance, 0, 1) : 0;
  const pct = Math.round(progress * 100);

  const lbPerWeek = PACE_LB_PER_WEEK[profile.goalPace];
  const paceLabel = PACE_LABEL[profile.goalPace];
  const remainingLb = Math.max(0, currentWeight - goalWeight);

  let etaLabel: string | null = null;
  if (!reached && remainingLb > 0 && lbPerWeek > 0) {
    const weeks = Math.ceil(remainingLb / lbPerWeek);
    const eta = new Date(now.getTime() + weeks * 7 * 86_400_000);
    etaLabel = `${MONTHS[eta.getMonth()]} ${eta.getDate()}`;
  }

  const headline = reached
    ? "You're at your goal"
    : changeLb >= 0.1
      ? `Down ${changeLb.toFixed(1)} ${unit}`
      : changeLb <= -0.1
        ? `Up ${Math.abs(changeLb).toFixed(1)} ${unit}`
        : "Just getting started";

  const caption = reached
    ? "Goal reached. Now it's about keeping the muscle."
    : etaLabel
      ? `${pct}% there · at your ${paceLabel} pace, goal by ${etaLabel}`
      : `${pct}% of the way to your goal`;

  return { startWeight, currentWeight, goalWeight, unit, changeLb, progress, pct, reached, paceLabel, lbPerWeek, headline, caption };
}
