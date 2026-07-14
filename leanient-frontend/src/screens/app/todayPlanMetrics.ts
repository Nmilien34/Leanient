import type { UserMedicationProtocol, UserProfile, Workout, WorkoutIntensity } from "@leanient/shared";
import { computeShotCycle, type ShotEnergy, type TodayLog } from "./todayMetrics";

/** The muscle-retention lever that's leaking most — what today should fix. */
export type DayFocus = "protein" | "training" | "pace";

/**
 * FRONTEND-ONLY display aggregate for the "Today's plan" screen — the three
 * daily moves (EAT / MOVE / STEADY). Derived from contract data:
 *   - EAT: today's logged protein vs the profile daily target
 *   - MOVE: the recommended workout (title, duration, equipment, muscle groups)
 *   - STEADY: shot-cycle advice keyed off days-since-shot
 *
 * Shares the shot-cycle math with the daily Home hero via `computeShotCycle`.
 */

export interface TodayPlanMove {
  title: string; // "Upper body · dumbbells"
  duration: string; // "22 min"
  tags: string[]; // ["Chest", "Back", "Arms"]
  subline: string;
}

export interface TodayPlanSteady {
  shotLabel: string; // "Shot +2"
  title: string;
  subline: string;
}

/** A protein-forward meal idea, sized so a couple of them close the gap. */
export interface EatSuggestion {
  name: string; // "Grilled chicken bowl"
  protein: number; // grams
  calories: number;
}

export interface TodayPlanEat {
  logged: number;
  target: number;
  remaining: number; // grams of protein left for the day
  ratio: number;
  pct: number;
  subline: string;
  /** Ideas to hit the remaining protein, tuned to today's appetite. */
  suggestions: EatSuggestion[];
}

export interface TodayPlan {
  subtitle: string; // "Tuesday · Day 44 · 2 days after your shot"
  eat: TodayPlanEat;
  move: TodayPlanMove | null;
  steady: TodayPlanSteady | null;
  /** Days since the last shot; null off-protocol. 0 marks shot day (adds the log-your-shot step). */
  daysSinceShot: number | null;
  /** The lever today should pull (the leaking score component); null when on track / no score. */
  focus: DayFocus | null;
  coachLine: string;
  /** Forward-looking result: what finishing today's plan earns, to motivate completion. */
  payoff: string;
}

const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NUMBER_WORD = ["zero", "one", "two", "three", "four", "five", "six"];
const APPROX_GRAMS_PER_MEAL = 30;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numberWord = (n: number) => (n >= 0 && n < NUMBER_WORD.length ? NUMBER_WORD[n] : String(n));

/**
 * Protein-forward meal ideas. `light` marks small, easy-to-stomach options that
 * suit a quiet GLP-1 appetite; the rest lean on a bigger appetite window.
 */
const MEAL_IDEAS: Array<EatSuggestion & { light: boolean }> = [
  { name: "Protein shake", protein: 30, calories: 160, light: true },
  { name: "Greek yogurt + berries", protein: 20, calories: 180, light: true },
  { name: "Cottage cheese + fruit", protein: 24, calories: 200, light: true },
  { name: "Two eggs + turkey slices", protein: 26, calories: 290, light: false },
  { name: "Tuna + whole-grain crackers", protein: 28, calories: 300, light: false },
  { name: "Tofu + edamame stir-fry", protein: 24, calories: 280, light: false },
  { name: "Salmon + greens", protein: 35, calories: 400, light: false },
  { name: "Grilled chicken bowl", protein: 40, calories: 450, light: false },
];

/**
 * Picks three meal ideas for the protein still owed today, tuned to appetite:
 * low energy favors small, sippable options; a good window favors bigger
 * protein hits to use the appetite while it's there.
 */
function eatSuggestions(remaining: number, energy: ShotEnergy): EatSuggestion[] {
  if (remaining <= 0) return [];
  const ranked = [...MEAL_IDEAS].sort((a, b) => {
    if (energy === "low") return Number(b.light) - Number(a.light) || a.protein - b.protein;
    if (energy === "good") return b.protein - a.protein;
    return Math.abs(a.protein - 30) - Math.abs(b.protein - 30); // mid: middle-sized first
  });
  return ranked.slice(0, 3).map(({ name, protein, calories }) => ({ name, protein, calories }));
}

const INTENSITY_RANK: Record<WorkoutIntensity, number> = { recovery: 0, easy: 1, moderate: 2, hard: 3 };

/**
 * Picks the day's session from the recommended pool by what the user's score
 * needs and what their shot cycle allows: a quiet shot day eases into recovery;
 * a "training is the leak" day with energy to spare leans into harder strength;
 * a "losing too fast" (pace) day stays light. Ties rotate by day so the same
 * session doesn't repeat — stable within a day, fresh across days.
 */
export function pickWorkout(
  pool: Workout[],
  opts: { focus: DayFocus | null; energy: ShotEnergy; daySeed: number },
): Workout | null {
  if (pool.length === 0) return null;
  const { focus, energy, daySeed } = opts;
  const target =
    energy === "low" ? 0.5 : focus === "pace" ? 1 : focus === "training" ? (energy === "good" ? 3 : 2) : 2;

  const scored = pool.map((w) => {
    let s = -Math.abs((INTENSITY_RANK[w.intensity] ?? 2) - target);
    if (focus === "training" && w.category === "strength") s += 0.6;
    if ((focus === "pace" || energy === "low") && (w.category === "recovery" || w.category === "mobility")) s += 0.6;
    return { w, s };
  });
  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s >= best - 0.001).map((x) => x.w);
  return top[((daySeed % top.length) + top.length) % top.length];
}

type Band = "strong" | "drifting" | "losing";

function scoreBand(score: number | null): Band | null {
  if (score == null) return null;
  if (score >= 80) return "strong";
  if (score >= 55) return "drifting";
  return "losing";
}

/** The coach line: one directive, keyed to the score band and today's lever. */
function coachLineFor(band: Band | null, focus: DayFocus | null, sessionName: string): string {
  if (band === "losing") {
    if (focus === "training") return `One ${sessionName} today is the fastest way back. It goes into Sunday's verdict.`;
    if (focus === "pace") return "Ease the pace. Protein to target today, let the week settle. Verdict Sunday.";
    return "Two protein meals today starts the climb back. Verdict Sunday.";
  }
  if (band === "drifting") {
    if (focus === "training") return `Today's ${sessionName} moves your number most. Verdict Sunday.`;
    if (focus === "pace") return "Hold protein and keep today steady. Verdict Sunday.";
    return "Hit protein today and your number climbs. Verdict Sunday.";
  }
  return `Two protein meals and the ${sessionName} hold the line. See you Sunday.`;
}

/** The result of finishing today's plan: what the user earns, one line. */
function payoffFor(band: Band | null, focus: DayFocus | null, hasMove: boolean): string {
  if (band === "losing") return "Finish today and the trend starts turning.";
  if (focus === "training" && hasMove) return "The session makes today count double.";
  if (focus === "pace") return "Steady today keeps the loss coming from fat.";
  if (focus === "protein") return "Hit protein and today goes in as a won day.";
  if (band === "strong") return "Finish and you bank another kept-muscle day.";
  return "Finish the plan and today goes in as a won day.";
}

/** STEADY pillar advice — what the shot cycle asks of today. */
function steadyAdvice(energy: ShotEnergy, nextShotDayName: string): { title: string; subline: string } {
  switch (energy) {
    case "good":
      return {
        title: "Front-load protein and water",
        subline: `Appetite fades later in the cycle, so eat it now. Next shot ${nextShotDayName}.`,
      };
    case "low":
      return {
        title: "Small, frequent protein",
        subline: `Appetite's quiet today. Sip water and keep meals tiny. Next shot ${nextShotDayName}.`,
      };
    case "mid":
    default:
      return {
        title: "Hydrate and ease in",
        subline: `Side effects can peak the next day or two. Keep it gentle. Next shot ${nextShotDayName}.`,
      };
  }
}

export function deriveTodayPlan(args: {
  profile: UserProfile;
  medication?: UserMedicationProtocol;
  recommendedWorkout?: Workout;
  /** The latest muscle-retention read, so the day's coaching and focus adapt to it. */
  retention?: { score: number; focus: DayFocus | null } | null;
  dailyLog: TodayLog;
  now: Date;
}): TodayPlan {
  const { profile, medication, recommendedWorkout, retention, dailyLog, now } = args;
  const focus = retention?.focus ?? null;
  const band = scoreBand(retention?.score ?? null);
  const weekday = WEEKDAYS_LONG[now.getDay()];

  // Subtitle + STEADY pillar both come from the shot cycle.
  let subtitle = weekday;
  let steady: TodayPlanSteady | null = null;
  let energy: ShotEnergy = "good";
  let daysSinceShot: number | null = null;

  if (medication) {
    const cycle = computeShotCycle(medication, now);
    energy = cycle.phase.energy;
    daysSinceShot = cycle.daysSinceShot;
    const shotPhrase =
      cycle.daysSinceShot === 0
        ? "shot day today"
        : cycle.daysSinceShot === 1
          ? "1 day after your shot"
          : `${cycle.daysSinceShot} days after your shot`;
    subtitle = `${weekday} · Day ${cycle.dayOnMed} · ${shotPhrase}`;
    const advice = steadyAdvice(energy, cycle.nextShotDayName);
    steady = {
      shotLabel: cycle.daysSinceShot === 0 ? "Shot day" : `Shot +${cycle.daysSinceShot}`,
      title: advice.title,
      subline: advice.subline,
    };
  }

  // EAT — today's protein against the daily target. Shot days flex the target
  // down (~75%, rounded to 5g): the reset day is won lightly, a shake counts.
  const logged = dailyLog.meals.reduce((sum, m) => sum + m.grams, 0);
  const target =
    daysSinceShot === 0
      ? Math.max(5, Math.round((profile.dailyProteinTarget * 0.75) / 5) * 5)
      : profile.dailyProteinTarget;
  const ratio = clamp01(target ? logged / target : 0);
  const remaining = Math.max(0, target - logged);
  let eatSubline: string;
  if (remaining <= 0) {
    eatSubline = "You've hit today's protein. Anything more is a bonus.";
  } else {
    const mealsLeft = Math.max(1, Math.round(remaining / APPROX_GRAMS_PER_MEAL));
    const appetite = energy === "good" ? " Appetite's easiest today." : energy === "low" ? " Keep portions small." : "";
    eatSubline = `${cap(numberWord(mealsLeft))} more protein-forward meal${mealsLeft === 1 ? "" : "s"}.${appetite}`;
  }

  // MOVE — today's recommended session.
  const move: TodayPlanMove | null = recommendedWorkout
    ? {
        title: `${recommendedWorkout.title} · ${recommendedWorkout.equipment}`,
        duration: `${recommendedWorkout.durationMinutes} min`,
        tags: recommendedWorkout.muscleGroups,
        subline: recommendedWorkout.shortDescription,
      }
    : null;

  const sessionName = recommendedWorkout ? `${recommendedWorkout.title.toLowerCase()} session` : "your session";

  return {
    subtitle,
    eat: { logged, target, remaining, ratio, pct: Math.round(ratio * 100), subline: eatSubline, suggestions: eatSuggestions(remaining, energy) },
    move,
    steady,
    daysSinceShot,
    focus,
    coachLine: coachLineFor(band, focus, sessionName),
    payoff: payoffFor(band, focus, Boolean(move)),
  };
}

/* ------------------------------------------------------------------ */
/* The plan as a checkable journey (the execution redesign's hero).    */
/* ------------------------------------------------------------------ */

export interface PlanChecklistItem {
  key: string;
  kind: "protein" | "session" | "shot";
  title: string;
  sub: string;
  done: boolean;
  /** Marks the day's priority lever (PlanTimeline's TODAY'S FOCUS eyebrow). */
  focus: boolean;
  /** Progress trailing for the active protein step, e.g. 64 (%). */
  trailingPct?: number;
  /** The active protein step expands into meal ideas + the scan button. */
  expandsEat?: boolean;
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * Turns the day's plan into 2-4 concrete, checkable actions: the protein
 * meal(s), the session, and (on shot day) logging the shot. Deterministic and
 * forgiving: logged protein collapses into one done step, and the next step is
 * always a single meal-sized bite, never the whole remaining mountain.
 */
export function buildPlanChecklist(args: {
  plan: TodayPlan;
  mealsLoggedToday: number;
  /** The most recent logged meal's name, for the "you logged X" read-back. */
  lastMealName?: string | null;
  eatDone: boolean;
  moveDone: boolean;
  /** Today's abandoned player session (started, not completed), if any. */
  sessionStart?: { elapsedSeconds: number } | null;
  doseLoggedToday: boolean;
}): PlanChecklistItem[] {
  const { plan, mealsLoggedToday, lastMealName, eatDone, moveDone, sessionStart, doseLoggedToday } = args;
  const items: PlanChecklistItem[] = [];
  const { logged, target, remaining, pct, suggestions } = plan.eat;

  // Protein: what's banked (done) and the next single bite (open).
  if (eatDone) {
    items.push({
      key: "protein-done",
      kind: "protein",
      title: `Protein · ${logged} of ${target}g`,
      sub: "Hit. Anything more is a bonus.",
      done: true,
      focus: false,
    });
  } else {
    if (logged > 0) {
      // Read back what they logged, and name what's still owed: the honest
      // "you did X, X' to go" moment right after a log.
      const mealsLine = `${cap(numberWord(mealsLoggedToday))} meal${mealsLoggedToday === 1 ? "" : "s"} logged.`;
      items.push({
        key: "protein-banked",
        kind: "protein",
        title: `Protein so far · ${logged}g`,
        sub: `${lastMealName ? `${lastMealName} logged.` : mealsLine} ${remaining}g to go.`,
        done: true,
        focus: false,
      });
    }
    const mealsLeft = Math.max(1, Math.round(remaining / APPROX_GRAMS_PER_MEAL));
    const chunk = Math.min(45, roundTo5(remaining / mealsLeft));
    const idea = suggestions[0];
    items.push({
      key: "protein-next",
      kind: "protein",
      title: `${logged > 0 ? "Next protein meal" : "Protein meal one"} · ~${chunk}g`,
      sub: idea ? `${idea.name} gets you there.` : `About ${chunk}g closes the gap.`,
      done: false,
      focus: plan.focus === "protein" || plan.focus == null,
      trailingPct: pct,
      expandsEat: true,
    });
  }

  // Session: the co-equal core loop. A started-but-unfinished session gets
  // named honestly (with credit for the minutes) instead of looking untouched.
  if (plan.move) {
    const startedMin = sessionStart && !moveDone ? Math.max(1, Math.round(sessionStart.elapsedSeconds / 60)) : null;
    items.push({
      key: "session",
      kind: "session",
      title: `${plan.move.title.split(" · ")[0]} · ${plan.move.duration}`,
      sub: startedMin != null ? `Started, ${startedMin} min in. Pick it back up.` : plan.move.subline,
      done: moveDone,
      focus: plan.focus === "training" && !moveDone,
    });
  }

  // Shot day: logging the dose is part of winning the day.
  if (plan.daysSinceShot === 0) {
    items.push({
      key: "shot",
      kind: "shot",
      title: "Log your shot",
      sub: doseLoggedToday ? "Logged. Cycle anchored." : "Anchors your week's cycle.",
      done: doseLoggedToday,
      focus: false,
    });
  }

  return items;
}
