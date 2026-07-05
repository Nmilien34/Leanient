import type { MealLog } from "@leanient/shared";
import { PROTEIN_DAY_RATIO } from "./consistency";

/**
 * FRONTEND-ONLY execution report for the This-week verdict block: the week as
 * what got DONE — protein days hit, sessions completed, loss pace against the
 * lean-safe line — plus one directive for next week. Forgiving by design: the
 * protein denominator is days elapsed so far, so Tuesday reads "2 of 2", never
 * "2 of 7 (failing)".
 */

export type ReportTone = "good" | "warn" | "neutral";

export interface ExecutionRow {
  key: "protein_days" | "sessions" | "pace";
  label: string;
  value: string;
  tone: ReportTone;
}

export interface ExecutionReport {
  rows: ExecutionRow[];
  /** One line naming what would turn every row green. */
  summary: string;
  /** The single directive for next week. */
  nextWeek: string;
}

/** Weekly loss beyond this (lb) risks muscle; at or under it is lean-safe. */
export const LEAN_SAFE_LB = 1.6;

/** Local YYYY-MM-DD key, so days bucket in the user's own timezone. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/** Days elapsed in the Monday-start week `now` falls in (1..7). */
export function weekDaysElapsed(now: Date): number {
  return ((now.getDay() + 6) % 7) + 1;
}

export function buildExecutionReport(args: {
  /** Meal logs for the current week (the context's weekMeals). */
  weekMeals: Array<Pick<MealLog, "protein" | "recordedAt">>;
  dailyProteinTarget: number;
  /** Resistance sessions completed this week vs the profile target. */
  sessionsThisWeek: number;
  weeklyWorkoutTarget: number;
  /** Week-over-week weight change in lb; negative = weight came off. Null hides the row. */
  weeklyDeltaLb: number | null;
  now: Date;
}): ExecutionReport {
  const { weekMeals, dailyProteinTarget, sessionsThisWeek, weeklyWorkoutTarget, weeklyDeltaLb, now } = args;

  // Protein days hit, out of the days that have actually happened.
  const elapsed = weekDaysElapsed(now);
  const needed = Math.max(1, dailyProteinTarget * PROTEIN_DAY_RATIO);
  const byDay = new Map<string, number>();
  for (const m of weekMeals) {
    const d = new Date(m.recordedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    byDay.set(key, (byDay.get(key) ?? 0) + m.protein);
  }
  let proteinDays = 0;
  for (let back = 0; back < elapsed; back += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    if ((byDay.get(dayKey(day)) ?? 0) >= needed) proteinDays += 1;
  }

  const sessionTarget = Math.max(1, weeklyWorkoutTarget);
  const sessionsShort = Math.max(0, sessionTarget - sessionsThisWeek);
  const lossLb = weeklyDeltaLb != null ? Math.abs(Math.min(0, weeklyDeltaLb)) : null;
  const paceSafe = lossLb != null && lossLb <= LEAN_SAFE_LB;

  const rows: ExecutionRow[] = [
    {
      key: "protein_days",
      label: "Protein days",
      value: `${proteinDays}/${elapsed}`,
      tone: proteinDays >= elapsed - 1 ? "good" : "warn",
    },
    {
      key: "sessions",
      label: "Sessions",
      value: `${sessionsThisWeek}/${sessionTarget}`,
      tone: sessionsShort === 0 ? "good" : sessionsShort === 1 ? "neutral" : "warn",
    },
  ];
  if (lossLb != null) {
    rows.push({
      key: "pace",
      label: "Loss pace",
      value: `${lossLb.toFixed(1)} lb`,
      tone: paceSafe ? "good" : "neutral",
    });
  }

  // One line + one directive, keyed to the biggest gap. Order of priority:
  // sessions (the strongest muscle signal), then protein, then pace.
  let summary: string;
  let nextWeek: string;
  if (sessionsShort > 0) {
    const word = sessionsShort === 1 ? "One more session" : `${sessionsShort} more sessions`;
    summary = `${word} and the week is green.`;
    nextWeek = `Hold ${proteinDays >= elapsed - 1 ? "your protein days" : "protein daily"}. Add ${sessionsShort === 1 ? "the next session" : `${sessionsShort} sessions`}, 20 minutes counts.`;
  } else if (proteinDays < elapsed - 1) {
    summary = "Sessions are in. Protein days are the gap.";
    nextWeek = "A protein-first breakfast locks the day early. Keep the sessions coming.";
  } else if (lossLb != null && !paceSafe) {
    summary = "Executed well. The scale is moving quickly.";
    nextWeek = "Keep protein and sessions exactly here. Let the pace settle toward lean-safe.";
  } else {
    summary = "All three levers are green. Hold the pattern.";
    nextWeek = "Same again: protein daily, every session, steady pace.";
  }

  return { rows, summary, nextWeek };
}
