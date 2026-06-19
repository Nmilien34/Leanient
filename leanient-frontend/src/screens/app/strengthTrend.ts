import type { WorkoutLog } from "@leanient/shared";

/**
 * Home "strength work" card. Resistance training is the lever the muscle engine
 * rewards, so this is the behavioral proof of it: how much the user is training
 * and whether it is holding week to week. When sets carry a load we trend total
 * volume (weight x reps); when they don't, we trend session frequency and nudge
 * them to log the weight. We deliberately do NOT claim a precise strength number
 * (logged sessions hit different exercises), only the honest direction.
 */

export type StrengthTrend = "climbing" | "holding" | "lighter" | "building";

export interface StrengthTrendView {
  /** Resistance sessions inside the trended window. */
  sessions: number;
  /** Resistance sessions in the last 7 days. */
  sessionsThisWeek: number;
  /** Weekly series (training volume when loaded, else session count), oldest to newest. */
  series: number[];
  /** True once any logged set carried a weight (vs bodyweight only). */
  hasLoad: boolean;
  trend: StrengthTrend;
  headline: string;
  subline: string;
}

const WEEKS = 6;
const WEEK_MS = 7 * 86_400_000;

/** Total training volume of a session: sum of weight x reps across every set. */
export function sessionVolume(log: WorkoutLog): number {
  return log.exercises.reduce(
    (total, ex) => total + ex.sets.reduce((t, set) => t + (set.weight ?? 0) * set.reps, 0),
    0,
  );
}

const HEAD_LOAD: Record<StrengthTrend, string> = {
  climbing: "Your strength work is climbing",
  holding: "Your strength is holding",
  lighter: "Training's been lighter lately",
  building: "Building your strength base",
};

const HEAD_SESSIONS: Record<StrengthTrend, string> = {
  climbing: "You're training more lately",
  holding: "You're training consistently",
  lighter: "Training's been lighter lately",
  building: "Building your strength base",
};

export function buildStrengthTrend(logs: WorkoutLog[], now: Date): StrengthTrendView | null {
  const resistance = logs.filter((l) => l.countsAsResistance);
  if (resistance.length === 0) return null;

  const volume = new Array<number>(WEEKS).fill(0);
  const counts = new Array<number>(WEEKS).fill(0);
  let sessions = 0;
  for (const log of resistance) {
    const ageWeeks = Math.floor((now.getTime() - new Date(log.recordedAt).getTime()) / WEEK_MS);
    if (ageWeeks < 0 || ageWeeks >= WEEKS) continue;
    const idx = WEEKS - 1 - ageWeeks; // oldest week at index 0, this week last
    volume[idx] += sessionVolume(log);
    counts[idx] += 1;
    sessions += 1;
  }
  if (sessions === 0) return null;

  const sessionsThisWeek = counts[WEEKS - 1];
  const hasLoad = resistance.some((l) => l.exercises.some((e) => e.sets.some((s) => s.weight != null)));
  const series = hasLoad ? volume : counts;

  // Direction: average of the last two weeks vs the weeks before (active weeks only).
  const avg = (xs: number[]) => {
    const active = xs.filter((x) => x > 0);
    return active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  };
  const recentAvg = avg(series.slice(WEEKS - 2));
  const priorAvg = avg(series.slice(0, WEEKS - 2));

  let trend: StrengthTrend;
  if (sessions < 3 || priorAvg === 0) trend = "building";
  else if (recentAvg >= priorAvg * 1.1) trend = "climbing";
  else if (recentAvg <= priorAvg * 0.9) trend = "lighter";
  else trend = "holding";

  const headline = (hasLoad ? HEAD_LOAD : HEAD_SESSIONS)[trend];
  const subline = hasLoad
    ? `${sessions} strength ${sessions === 1 ? "session" : "sessions"} in the last 6 weeks`
    : `${sessions} ${sessions === 1 ? "session" : "sessions"} logged. Add the weight you used to track strength.`;

  return { sessions, sessionsThisWeek, series, hasLoad, trend, headline, subline };
}
