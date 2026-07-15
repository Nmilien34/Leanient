import type { ShotCycle } from "./todayMetrics";

/**
 * The v2 Home hero speaks in day personalities: every day of the shot cycle
 * gets a name, a directive headline, and a pattern line, so the same checklist
 * reads as a different story on each cycle day (design/home-coach.html).
 */
export type CycleDayKind = "reset" | "settling" | "greenlight" | "steady" | "defense";

export interface CyclePersonality {
  kind: CycleDayKind;
  /** Uppercase pill copy, e.g. "SHOT +5 · THE HUNGER WINDOW". */
  pill: string;
  /** Amber styling for the guard days + shot day ritual accents. */
  amber: boolean;
  /** The bold half of the headline, e.g. "Defense day." */
  headline: string;
  /** The quiet half, e.g. "Protein early." */
  headlineSub: string;
  /** The YOUR PATTERN row line. Cycle truths until per-user analytics land. */
  pattern: string;
}

const shotLabel = (daysSinceShot: number) => (daysSinceShot === 0 ? "SHOT DAY" : `SHOT +${daysSinceShot}`);

/** The plan-header name for each day personality ("TODAY'S PLAN · DEFENSE DAY"). */
export const PLAN_LABELS: Record<CycleDayKind, string> = {
  reset: "RESET DAY",
  settling: "EASY DAY",
  greenlight: "GREEN LIGHT DAY",
  steady: "STEADY DAY",
  defense: "DEFENSE DAY",
};

export function deriveCyclePersonality(cycle: ShotCycle): CyclePersonality {
  const d = cycle.daysSinceShot;
  const untilNext = cycle.daysUntilNext;
  if (d === 0) {
    return {
      kind: "reset",
      pill: `${shotLabel(d)} · NEW CYCLE`,
      amber: false,
      headline: "Reset day.",
      headlineSub: "Keep it gentle.",
      pattern: "Days 1 and 2 usually run smooth. Your easiest window opens tomorrow.",
    };
  }
  if (d === 1) {
    return {
      kind: "settling",
      pill: `${shotLabel(d)} · SETTLING IN`,
      amber: false,
      headline: "Easy does it.",
      headlineSub: "Water and small meals.",
      pattern: "Side effects peak in the first day or two, then fade fast.",
    };
  }
  if (untilNext <= 2 && d >= 2) {
    return {
      kind: "defense",
      pill: `${shotLabel(d)} · HUNGER TONIGHT`,
      amber: true,
      headline: "Defense day.",
      headlineSub: "Protein early.",
      pattern: "Med levels run lowest in the day or two before your shot, so appetite returns first at night. We plan for it.",
    };
  }
  if (d === 2 || d === 3) {
    return {
      kind: "greenlight",
      pill: `${shotLabel(d)} · YOUR STRONGEST WINDOW`,
      amber: false,
      headline: "Green light.",
      headlineSub: "Bank the big stuff.",
      pattern: "Days 2 and 3 are the quietest appetite and best energy of your cycle.",
    };
  }
  if (d === 4) {
    return {
      kind: "steady",
      pill: `${shotLabel(d)} · HOLDING STEADY`,
      amber: false,
      headline: "Steady day.",
      headlineSub: "Keep the rhythm.",
      pattern: "Mid cycle. Energy holds when protein does.",
    };
  }
  return {
    kind: "steady",
    pill: `${shotLabel(d)} · HOLDING STEADY`,
    amber: false,
    headline: "Steady day.",
    headlineSub: "Keep the rhythm.",
    pattern: "Mid cycle. Energy holds when protein does.",
  };
}

/**
 * The hero ribbon, built from the user's REAL schedule: seven cells anchored
 * at the most recent shot day, every shot day in the window marked (a
 * Wed+Thu twice-a-week user sees two SHOT cells), today ringed at its true
 * position. Changing the schedule re-derives all of it.
 */
export interface CycleRibbonCell {
  label: string;
  isShot: boolean;
}

export function buildCycleRibbon(args: {
  daysSinceShot: number;
  shotDays: string[] | null | undefined;
  now: Date;
}): CycleRibbonCell[] {
  const shotIdx = (args.shotDays ?? []).map((d) => WEEKDAY_INDEX[d.toLowerCase()]).filter((i) => i != null);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(args.now);
    date.setDate(date.getDate() - args.daysSinceShot + i);
    const pos = shotIdx.length
      ? Math.min(...shotIdx.map((shot) => (date.getDay() - shot + 7) % 7))
      : i;
    return { label: pos === 0 ? "SHOT" : `+${pos}`, isShot: pos === 0 };
  });
}

/** Greeting for the morning read: shot day gets its own name, else by hour. */
export function greetingForHour(hour: number, name?: string | null, isShotDay = false): string {
  const part = isShotDay ? "Shot day" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}.` : `${part}.`;
}

/**
 * Consecutive weeks (counting back from this week) with at least one dose
 * logged — the "6 weeks steady" read on shot day.
 */
export function weeksSteadyFromDoses(doses: Array<{ recordedAt: string }>, now: Date): number {
  const times = doses
    .map((d) => new Date(d.recordedAt).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a);
  let weeks = 0;
  const WEEK = 7 * 86_400_000;
  while (times.some((t) => now.getTime() - t >= weeks * WEEK && now.getTime() - t < (weeks + 1) * WEEK)) {
    weeks += 1;
  }
  return weeks;
}

/**
 * The morning-read pill, priority order: the shot-day streak ("6 weeks
 * steady"), yesterday's banked protein, then the journey day chip — the
 * header always opens with something earned.
 */
export function morningPill(args: {
  yesterdayProtein: number;
  dayOnMed: number | null;
  medicationName?: string | null;
  isShotDay?: boolean;
  weeksSteady?: number;
  /** Green-light days open with the journey win instead. */
  kind?: CycleDayKind;
  lbLost?: number | null;
  retention?: number | null;
}): { label: string; check: boolean } | null {
  if (args.isShotDay && (args.weeksSteady ?? 0) >= 2) {
    return { label: `${args.weeksSteady} weeks steady`, check: true };
  }
  if (args.kind === "greenlight" && args.lbLost != null && args.lbLost >= 1) {
    const muscle = args.retention != null ? ` · muscle ${args.retention}` : "";
    return { label: `↓ ${Math.round(args.lbLost)} lb${muscle}`, check: true };
  }
  if (args.yesterdayProtein > 0) {
    return { label: `${Math.round(args.yesterdayProtein)}g yesterday`, check: true };
  }
  if (args.dayOnMed != null && args.medicationName) {
    return { label: `Day ${args.dayOnMed} · ${args.medicationName}`, check: false };
  }
  return null;
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

/**
 * The personal YOUR PATTERN line: maps the user's logged protein history onto
 * their cycle position and, when today's position has enough samples, speaks
 * from THEIR data ("Day 5 dipped in your recent cycles"). Falls back to the
 * personality's cycle truth until the history is thick enough.
 */
export function derivePersonalPattern(args: {
  meals: Array<{ protein: number; recordedAt: string }>;
  dailyProteinTarget: number;
  shotDays: string[] | null | undefined;
  todayDaysSinceShot: number;
  now: Date;
  fallback: string;
}): string {
  const { meals, dailyProteinTarget, shotDays, todayDaysSinceShot, now, fallback } = args;
  const shotIdx = (shotDays ?? []).map((d) => WEEKDAY_INDEX[d.toLowerCase()]).filter((i) => i != null);
  if (!shotIdx.length || dailyProteinTarget <= 0) return fallback;

  // Protein per past calendar day (today excluded — it isn't finished yet).
  const todayKey = now.toDateString();
  const byDay = new Map<string, { protein: number; weekday: number }>();
  for (const meal of meals) {
    const at = new Date(meal.recordedAt);
    if (Number.isNaN(at.getTime())) continue;
    const key = at.toDateString();
    if (key === todayKey) continue;
    const entry = byDay.get(key) ?? { protein: 0, weekday: at.getDay() };
    entry.protein += meal.protein;
    byDay.set(key, entry);
  }

  // Hit-rate for days that sat at today's cycle position.
  let samples = 0;
  let hits = 0;
  for (const { protein, weekday } of byDay.values()) {
    const pos = Math.min(...shotIdx.map((s) => (weekday - s + 7) % 7));
    if (pos !== todayDaysSinceShot) continue;
    samples += 1;
    if (protein >= dailyProteinTarget * 0.9) hits += 1;
  }
  if (samples < 2) return fallback;

  const dayName = todayDaysSinceShot === 0 ? "Shot day" : `Day ${todayDaysSinceShot}`;
  if (hits / samples <= 0.5) {
    return `${dayName} dipped in your recent cycles. We plan for it now.`;
  }
  return `${dayName} has held strong in your recent cycles. Keep the play the same.`;
}

/**
 * Green-light pattern: where do their logged sessions land on the cycle?
 * When today's position is their most-trained day (2+ sessions), say so from
 * their own logs. Null hands the line back to the protein/cycle fallbacks.
 */
export function deriveLiftPattern(args: {
  workouts: Array<{ recordedAt: string }>;
  shotDays: string[] | null | undefined;
  todayDaysSinceShot: number;
}): string | null {
  const shotIdx = (args.shotDays ?? []).map((d) => WEEKDAY_INDEX[d.toLowerCase()]).filter((i) => i != null);
  if (!shotIdx.length) return null;
  const counts = new Map<number, number>();
  for (const w of args.workouts) {
    const at = new Date(w.recordedAt);
    if (Number.isNaN(at.getTime())) continue;
    const pos = Math.min(...shotIdx.map((s) => (at.getDay() - s + 7) % 7));
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }
  const todayCount = counts.get(args.todayDaysSinceShot) ?? 0;
  if (todayCount < 2) return null;
  const isMax = [...counts.values()].every((c) => c <= todayCount);
  if (!isMax) return null;
  return `Day ${args.todayDaysSinceShot} is your best lift day by your own logs.`;
}

/** Sum of protein logged on the calendar day before `now`. */
export function proteinLoggedYesterday(
  meals: Array<{ protein?: number | null; grams?: number; recordedAt: string }>,
  now: Date,
): number {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const key = y.toDateString();
  return meals.reduce((sum, m) => {
    const at = new Date(m.recordedAt);
    if (Number.isNaN(at.getTime()) || at.toDateString() !== key) return sum;
    return sum + (m.protein ?? m.grams ?? 0);
  }, 0);
}
