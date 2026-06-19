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

/** The coach line, keyed to how the score's doing and which lever today should pull. */
function coachLineFor(band: Band | null, focus: DayFocus | null, sessionName: string): string {
  if (band === "losing") {
    if (focus === "training") return `Your score slipped. One ${sessionName} today is the fastest way back. I'll fold it into Sunday's verdict.`;
    if (focus === "pace") return "Weight's coming off fast. Ease the pace and lock protein today to protect muscle. Verdict updates Sunday.";
    return "Your score slipped. Two protein meals today is the fastest way back. Verdict updates Sunday.";
  }
  if (band === "drifting") {
    if (focus === "training") return `Training's the leak this week. Today's ${sessionName} moves your number most. Verdict Sunday.`;
    if (focus === "pace") return "You're losing a touch fast. Hold protein and keep it steady today. Verdict Sunday.";
    return "Protein's the lever this week. Hit it today and your number climbs. Verdict Sunday.";
  }
  return `You're keeping your muscle. Two protein meals and the ${sessionName} holds the line. I'll fold it into Sunday's verdict.`;
}

/** The result of finishing today's plan: what the user earns, to motivate completion. */
function payoffFor(band: Band | null, focus: DayFocus | null, hasMove: boolean): string {
  if (band === "losing") return "Finish today and you start winning your muscle back. A few days like this turn the trend.";
  if (focus === "training" && hasMove) return "Do all three and today's session is what makes your muscle hold.";
  if (focus === "pace") return "Stick to this and the fat keeps coming off while your muscle stays put.";
  if (focus === "protein") return "Hit your protein today and you protect the muscle under the fat you're losing.";
  if (band === "strong") return "Finish today and you bank another day of kept muscle. This is how the streak holds.";
  return "Finish today's plan and you protect the muscle under the fat you're dropping.";
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

  if (medication) {
    const cycle = computeShotCycle(medication, now);
    energy = cycle.phase.energy;
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

  // EAT — today's protein against the daily target.
  const logged = dailyLog.meals.reduce((sum, m) => sum + m.grams, 0);
  const target = profile.dailyProteinTarget;
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
    focus,
    coachLine: coachLineFor(band, focus, sessionName),
    payoff: payoffFor(band, focus, Boolean(move)),
  };
}
