import type { DayMark } from "./consistency";

/**
 * The This-week map (design/home-coach.html frame 04): the rolling last 7
 * days laid over the shot cycle, so the week reads the way the coach plans
 * it — shot day, easy window, mid, guard days.
 */
export type WeekPhase = "SHOT" | "EASY" | "MID" | "GUARD";
export type WeekCellState = "shot" | "hit" | "miss" | "open";

export interface WeekMapCell {
  /** "SAT" / "Today". */
  name: string;
  phase: WeekPhase;
  state: WeekCellState;
  isToday: boolean;
}

export interface WeekMapView {
  cells: WeekMapCell[];
  /** "Thu + Fri already have a plan." — the guard days, named. */
  caption: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function phaseFor(pos: number, untilNext: number): WeekPhase {
  if (pos === 0) return "SHOT";
  if (untilNext <= 2) return "GUARD";
  if (pos <= 3) return "EASY";
  return "MID";
}

export function buildWeekMap(args: {
  /** Rolling last-7 protein marks, oldest → today (consistency.proteinDots). */
  proteinDots: DayMark[];
  shotDays: string[] | null | undefined;
  now: Date;
}): WeekMapView | null {
  const { proteinDots, shotDays, now } = args;
  const shotIdx = (shotDays ?? []).map((d) => WEEKDAY_INDEX[d.toLowerCase()]).filter((i) => i != null);
  if (!shotIdx.length || proteinDots.length !== 7) return null;

  const guardNames: string[] = [];
  const cells = proteinDots.map((mark, i): WeekMapCell => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    const weekday = date.getDay();
    const pos = Math.min(...shotIdx.map((s) => (weekday - s + 7) % 7));
    const untilNext = Math.min(...shotIdx.map((s) => ((s - weekday + 7) % 7) || 7));
    const phase = phaseFor(pos, untilNext);
    if (phase === "GUARD") guardNames.push(CAP[weekday]);
    const isToday = i === 6;
    const state: WeekCellState = pos === 0 ? "shot" : mark === "hit" ? "hit" : isToday ? "open" : "miss";
    return { name: isToday ? "Today" : WEEKDAYS_SHORT[weekday], phase, state, isToday };
  });

  const todayGuard = cells[6].phase === "GUARD";
  const caption = todayGuard
    ? "Today is a guard day. The plan already knows."
    : guardNames.length
      ? `${[...new Set(guardNames)].join(" + ")} already have a plan.`
      : "Every day this week has a plan.";

  return { cells, caption };
}
