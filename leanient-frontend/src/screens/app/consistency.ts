import type { MealLog, WorkoutLog } from "@leanient/shared";

/**
 * FRONTEND-ONLY rolling-consistency read: how often the two core levers landed
 * over the LAST 7 DAYS (today included). This is the forgiving execution
 * metric the redesign leads with — a rolling window, never a breakable
 * streak: one missed day costs one dot, not the whole number, and today only
 * ever counts FOR you (an unfinished today is "open", not a miss).
 */

export type DayMark = "hit" | "miss" | "open";

export interface RollingConsistency {
  /** Days (of the last 7) where logged protein reached the day's target. */
  proteinDaysHit: number;
  /** Days (of the last 7) with at least one logged session. */
  sessionDays: number;
  /** Sessions the profile asks for per week — the tile's denominator. */
  sessionTarget: number;
  /** Oldest→today protein marks for the 7-day dot strip. */
  proteinDots: DayMark[];
  /** Short labels ("Mon".."Sun", last is "Today") aligned with the dots. */
  dayLabels: string[];
}

/** A day counts once protein reaches this share of target — a full-enough day. */
export const PROTEIN_DAY_RATIO = 0.9;
export const WINDOW_DAYS = 7;

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local YYYY-MM-DD key, so days bucket in the user's own timezone. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function buildRollingConsistency(args: {
  /** Meal logs covering at least the last 7 days. */
  meals: Array<Pick<MealLog, "protein" | "recordedAt">>;
  /** Workout logs covering at least the last 7 days (extra history is fine). */
  workouts: Array<Pick<WorkoutLog, "recordedAt">>;
  dailyProteinTarget: number;
  weeklyWorkoutTarget: number;
  now: Date;
}): RollingConsistency {
  const { meals, workouts, dailyProteinTarget, weeklyWorkoutTarget, now } = args;

  const proteinByDay = new Map<string, number>();
  for (const m of meals) {
    const d = new Date(m.recordedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    proteinByDay.set(key, (proteinByDay.get(key) ?? 0) + m.protein);
  }
  const sessionDaysSet = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.recordedAt);
    if (Number.isNaN(d.getTime())) continue;
    sessionDaysSet.add(dayKey(d));
  }

  const needed = Math.max(1, dailyProteinTarget * PROTEIN_DAY_RATIO);
  const proteinDots: DayMark[] = [];
  const dayLabels: string[] = [];
  let proteinDaysHit = 0;
  let sessionDays = 0;

  for (let back = WINDOW_DAYS - 1; back >= 0; back -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = dayKey(day);
    const isToday = back === 0;
    const hit = (proteinByDay.get(key) ?? 0) >= needed;
    if (hit) proteinDaysHit += 1;
    // Today is still in play: it reads "open" until it's a hit, never a miss.
    proteinDots.push(hit ? "hit" : isToday ? "open" : "miss");
    dayLabels.push(isToday ? "Today" : WEEKDAYS_SHORT[day.getDay()]);
    if (sessionDaysSet.has(key)) sessionDays += 1;
  }

  return {
    proteinDaysHit,
    sessionDays,
    sessionTarget: Math.max(0, weeklyWorkoutTarget),
    proteinDots,
    dayLabels,
  };
}
