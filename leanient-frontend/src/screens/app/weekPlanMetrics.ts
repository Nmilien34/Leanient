import type { GoalPace, UserMedicationProtocol, UserProfile, WeeklyVerdict, WeightLog, Workout } from "@leanient/shared";
import type { DayFocus } from "./todayPlanMetrics";

/** What last week's verdict looked like — drives this week's focus and recap. */
export interface LastWeekRead {
  retention: number;
  /** The leaking component last week, or null when everything held. */
  focus: DayFocus | null;
  /** That component's score (for the recap line). */
  focusScore: number | null;
}

const FOCUS_LABEL: Record<DayFocus, string> = { protein: "Protein", training: "Training", pace: "Pace" };

/**
 * FRONTEND-ONLY display aggregate for the "This week's plan" screen — the three
 * moves (protein / training / pace) that keep muscle. Everything is derived from
 * contract data so the screen stays presentational:
 *   - protein: profile daily target × 7 vs the verdict's logged per-day average
 *   - training: the weekly target + the sessions completed, laid over the plan
 *   - pace: goal pace → lb/week → an ETA to the goal weight
 *
 * The per-session day labels and the coaching lines are the only non-contract
 * bits; there's no weekly-schedule contract yet, so the session list is built
 * from the recommended workouts and the real completed count.
 */

export type SessionStatus = "done" | "today" | "upcoming";

export interface WeekPlanSession {
  title: string;
  detail: string; // e.g. "22 min" for today's session
  statusLabel: string; // "Done" | "Today" | "Upcoming"
  status: SessionStatus;
}

export interface WeekPlan {
  weekRangeLabel: string; // "Week of May 25 – May 31"
  shotDayName: string | null; // "Sunday"
  protein: { logged: number; target: number; dailyTarget: number; ratio: number; pct: number; subline: string };
  training: { done: number; target: number; sessions: WeekPlanSession[] };
  pace: {
    lbPerWeek: number;
    remaining: number;
    goalWeight: number;
    unit: string;
    etaLabel: string;
    statusLabel: string;
    headline: string;
    subline: string;
  };
  /** This week's lever, estimated from last week's verdict; null for a first week / all-strong. */
  focus: DayFocus | null;
  /** One line recapping last week, or null when there's no prior week. */
  recap: string | null;
  coachLine: string;
}

/** Recap of last week, naming the lever this week inherits. */
function weekRecap(lastWeek: LastWeekRead | null): string | null {
  if (!lastWeek) return null;
  if (!lastWeek.focus) return `Last week held strong (muscle ${lastWeek.retention}). Keep the rhythm.`;
  return `Last week: muscle ${lastWeek.retention}. ${FOCUS_LABEL[lastWeek.focus]} was the soft spot — that's this week's focus.`;
}

/** Coach line set by last week's leaking lever. */
function weekCoachLine(focus: DayFocus | null): string {
  if (focus === "training") return "Training slipped last week. Three solid sessions this week pulls your number back up.";
  if (focus === "protein") return "Protein dipped last week. Two protein-forward meals a day gets it back.";
  if (focus === "pace") return "Last week's loss ran fast. Ease the pace and lock protein to protect the muscle.";
  return "Nail these three and the muscle under your face stays put. I'll send your next verdict Sunday.";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Healthy weekly loss rate per goal pace (lb/week), GLP-1 muscle-safe bands. */
const PACE_LB_PER_WEEK: Record<GoalPace, number> = {
  gentle: 0.5,
  steady: 1.0,
  aggressive: 1.5,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function weekRange(weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "This week";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `Week of ${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  done: "Done",
  today: "Today",
  upcoming: "Upcoming",
};

export function deriveWeekPlan(args: {
  profile: UserProfile;
  verdict: WeeklyVerdict;
  medication?: UserMedicationProtocol;
  weightLogs: WeightLog[];
  sessions: Workout[];
  /** Last week's verdict read, so this week's plan estimates off what happened. */
  lastWeek?: LastWeekRead | null;
  now: Date;
}): WeekPlan {
  const { profile, verdict, medication, weightLogs, sessions, lastWeek = null, now } = args;
  const inputs = verdict.inputsUsed;
  const focus = lastWeek?.focus ?? null;

  // 1 · Protein — daily target scaled to the week.
  const dailyTarget = profile.dailyProteinTarget;
  const proteinTarget = dailyTarget * 7;
  const proteinLogged = Math.round((inputs?.proteinGramsPerDay ?? 0) * 7);
  const proteinRatio = clamp01(proteinTarget ? proteinLogged / proteinTarget : 0);
  const proteinPct = Math.round(proteinRatio * 100);
  const proteinSubline =
    proteinPct >= 100
      ? "You've hit it this week. Hold the line."
      : `${proteinPct}% so far. Two protein-forward meals a day gets you there.`;

  // 2 · Training — completed count laid over the planned sessions.
  const trainingDone = inputs?.resistanceWorkoutsCompleted ?? 0;
  const trainingTarget = profile.weeklyWorkoutTarget;
  const planSessions: WeekPlanSession[] = Array.from({ length: trainingTarget }, (_, i) => {
    const workout = sessions[i];
    const status: SessionStatus = i < trainingDone ? "done" : i === trainingDone ? "today" : "upcoming";
    return {
      title: workout?.title ?? `Session ${i + 1}`,
      detail: status === "today" && workout ? `${workout.durationMinutes} min` : "",
      statusLabel: STATUS_LABEL[status],
      status,
    };
  });

  // 3 · Pace — goal pace → lb/week → ETA to the goal weight.
  const lbPerWeek = PACE_LB_PER_WEEK[profile.goalPace];
  const series = weightLogs.map((wlog) => wlog.value);
  const current = series.length ? series[series.length - 1] : (inputs?.weight?.value ?? profile.goalWeight);
  const unit = weightLogs[weightLogs.length - 1]?.unit ?? inputs?.weight?.unit ?? profile.goalWeightUnit;
  const remaining = Math.max(0, Math.round(current - profile.goalWeight));
  const weeksToGoal = lbPerWeek > 0 ? Math.ceil(remaining / lbPerWeek) : 0;
  const eta = new Date(now.getTime() + weeksToGoal * 7 * 86_400_000);
  const etaLabel = `${MONTHS[eta.getMonth()]} ${eta.getDate()}`;

  // Recent weekly loss decides whether the pace is on track (0.5–2.0 lb is the band).
  const lastLoss = series.length >= 2 ? series[series.length - 2] - series[series.length - 1] : lbPerWeek;
  const paceStatus = lastLoss <= 0 ? "Stalled" : lastLoss > 2.0 ? "Too fast" : "On track";

  return {
    weekRangeLabel: weekRange(verdict.weekOf),
    shotDayName: medication ? medication.shotDays.map(cap).join(", ") : null,
    protein: { logged: proteinLogged, target: proteinTarget, dailyTarget, ratio: proteinRatio, pct: proteinPct, subline: proteinSubline },
    training: { done: trainingDone, target: trainingTarget, sessions: planSessions },
    pace: {
      lbPerWeek,
      remaining,
      goalWeight: profile.goalWeight,
      unit,
      etaLabel,
      statusLabel: paceStatus,
      headline: `${remaining} ${unit} to your goal`,
      subline: `Reaching ${profile.goalWeight} ${unit} by ${etaLabel}. Slow enough to keep muscle.`,
    },
    focus,
    recap: weekRecap(lastWeek),
    coachLine: weekCoachLine(focus),
  };
}
