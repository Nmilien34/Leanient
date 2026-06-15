import type { UserMedicationProtocol, UserProfile, Workout } from "@leanient/shared";
import { computeShotCycle, type ShotEnergy, type TodayLog } from "./todayMetrics";

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
  coachLine: string;
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
  dailyLog: TodayLog;
  now: Date;
}): TodayPlan {
  const { profile, medication, recommendedWorkout, dailyLog, now } = args;
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
    coachLine: `Two protein meals and the ${sessionName}, and that's today won. I'll fold it into Sunday's verdict.`,
  };
}
