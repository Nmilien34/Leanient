import type { MealLog, WorkoutLog } from "@leanient/shared";
import { PROTEIN_DAY_RATIO } from "./consistency";
import type { SessionStartMap } from "./sessionStarts";

/**
 * FRONTEND-ONLY "your days" review for the Progress tab: each of the last 7
 * days as what actually happened — protein logged vs target, the session
 * (done, started-but-unfinished, or none), food energy logged, and an
 * estimated session burn — plus a one-line muscle read. Honest by design: a
 * started session gets named with its minutes, and the math is labeled as an
 * estimate (MET-based), never a fake full energy balance.
 */

export type DaySessionState = "done" | "started" | "none";

export interface DayReview {
  dateKey: string;
  /** "Today" or "Mon, Jul 6". */
  dayLabel: string;
  proteinG: number;
  proteinTarget: number;
  proteinHit: boolean;
  /** Food energy logged (kcal), summed from the day's meals. */
  intakeCal: number;
  calorieTarget: number;
  session: { state: DaySessionState; minutes: number; title: string | null };
  /** MET-estimated session burn (kcal); null without minutes or body weight. */
  burnedCal: number | null;
  /** Collapsed one-liner. */
  summary: string;
  /** The expanded muscle read. */
  muscleRead: string;
}

/** Moderate resistance training in the MET compendium. */
export const RESISTANCE_MET = 5.0;
/** A player session shorter than this reads as a tap, not a start. */
export const MIN_STARTED_SECONDS = 60;

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/** Estimated kcal for resistance work: MET × 3.5 × kg / 200 per minute. */
export function estimateSessionBurn(minutes: number, weightLb: number | null): number | null {
  if (!weightLb || minutes <= 0) return null;
  const kg = weightLb * 0.45359237;
  const perMinute = (RESISTANCE_MET * 3.5 * kg) / 200;
  return Math.round((perMinute * minutes) / 5) * 5;
}

function summaryFor(r: Pick<DayReview, "proteinG" | "proteinHit" | "session">): string {
  const { proteinG, proteinHit, session } = r;
  if (session.state === "done") {
    return proteinHit ? `Protein hit · ${session.minutes}-min session` : `${proteinG}g protein · ${session.minutes}-min session`;
  }
  if (session.state === "started") {
    return `${proteinG}g protein · session started, unfinished`;
  }
  if (proteinHit) return "Protein hit · no session";
  return proteinG > 0 ? `${proteinG}g protein logged` : "Nothing logged";
}

function muscleReadFor(r: Pick<DayReview, "proteinG" | "proteinTarget" | "proteinHit" | "session">): string {
  const { proteinG, proteinTarget, proteinHit, session } = r;
  if (proteinHit && session.state === "done") {
    return "Full muscle signal: protein hit and a session banked. Best day you can give it.";
  }
  if (session.state === "done") {
    return `The session helped hold muscle. Protein landed at ${proteinG} of ${proteinTarget}g.`;
  }
  if (session.state === "started") {
    return `You started the session (${session.minutes} min) and logged ${proteinG}g. Finish it next time and the day flips.`;
  }
  if (proteinHit) {
    return "Protein held the line. A session would have doubled the signal.";
  }
  return "Quiet day for muscle signal. They happen. Today counts fresh.";
}

export function buildDayReviews(args: {
  /** Meal logs covering at least the window (extra history is fine). */
  meals: Array<Pick<MealLog, "protein" | "calories" | "recordedAt">>;
  /** Workout logs covering at least the window. */
  workouts: Array<Pick<WorkoutLog, "recordedAt" | "durationMinutes"> & { customWorkoutName?: string | null }>;
  /** Device-local started-session map (sessionStarts). */
  sessionStarts: SessionStartMap;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  /** Latest body weight in lb, for the burn estimate; null skips it. */
  weightLb: number | null;
  now: Date;
  days?: number;
}): DayReview[] {
  const { meals, workouts, sessionStarts, dailyProteinTarget, dailyCalorieTarget, weightLb, now, days = 7 } = args;

  const proteinByDay = new Map<string, number>();
  const calByDay = new Map<string, number>();
  for (const m of meals) {
    const d = new Date(m.recordedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKeyOf(d);
    proteinByDay.set(key, (proteinByDay.get(key) ?? 0) + m.protein);
    calByDay.set(key, (calByDay.get(key) ?? 0) + (m.calories ?? 0));
  }
  const workoutByDay = new Map<string, { minutes: number; title: string | null }>();
  for (const w of workouts) {
    const d = new Date(w.recordedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKeyOf(d);
    const prev = workoutByDay.get(key);
    workoutByDay.set(key, {
      minutes: (prev?.minutes ?? 0) + w.durationMinutes,
      title: prev?.title ?? w.customWorkoutName ?? null,
    });
  }

  const needed = Math.max(1, dailyProteinTarget * PROTEIN_DAY_RATIO);
  const reviews: DayReview[] = [];

  for (let back = 0; back < days; back += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = dayKeyOf(day);
    const proteinG = Math.round(proteinByDay.get(key) ?? 0);
    const intakeCal = Math.round(calByDay.get(key) ?? 0);
    const logged = workoutByDay.get(key);
    const start = sessionStarts[key];

    // A logged workout wins; otherwise a real player start (past the tap
    // threshold, not completed) reads as started-but-unfinished.
    let session: DayReview["session"] = { state: "none", minutes: 0, title: null };
    if (logged) {
      session = { state: "done", minutes: logged.minutes, title: logged.title };
    } else if (start && !start.completed && start.elapsedSeconds >= MIN_STARTED_SECONDS) {
      session = { state: "started", minutes: Math.max(1, Math.round(start.elapsedSeconds / 60)), title: start.workoutTitle };
    }

    const base = {
      proteinG,
      proteinTarget: dailyProteinTarget,
      proteinHit: proteinG >= needed,
      session,
    };

    reviews.push({
      dateKey: key,
      dayLabel: back === 0 ? "Today" : `${WEEKDAYS_SHORT[day.getDay()]}, ${MONTHS[day.getMonth()]} ${day.getDate()}`,
      ...base,
      intakeCal,
      calorieTarget: dailyCalorieTarget,
      burnedCal: session.minutes > 0 ? estimateSessionBurn(session.minutes, weightLb) : null,
      summary: summaryFor(base),
      muscleRead: muscleReadFor(base),
    });
  }

  return reviews;
}
