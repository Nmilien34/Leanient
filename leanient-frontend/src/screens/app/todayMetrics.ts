import type { MealLog, UserMedicationProtocol, UserProfile, VerdictStatus, Weekday, Workout, WorkoutLog } from "@leanient/shared";

export interface TodayLogEntry {
  name: string;
  grams: number;
  timeLabel: string;
}

/** What's been logged so far today, feeding the Home "Today" scope. */
export interface TodayLog {
  meals: TodayLogEntry[];
  workoutsDone: number;
}

/** Format an ISO timestamp to a short clock label like "8:10a". */
function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const meridiem = h < 12 ? "a" : "p";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${meridiem}`;
}

/**
 * Aggregate today's meal and workout logs into the "Today" view shape. Protein
 * grams sum into the protein ring, and workout count feeds the session tile.
 */
export function toTodayLog(meals: MealLog[], workouts: WorkoutLog[] = []): TodayLog {
  return {
    meals: meals.map((m) => ({ name: m.foodName, grams: Math.round(m.protein), timeLabel: formatLogTime(m.recordedAt) })),
    workoutsDone: workouts.length,
  };
}

/**
 * FRONTEND-ONLY display aggregate for the Home "Today" scope (the daily re-skin
 * behind the This week / Today toggle). Like `deriveHomeMetrics`, it keeps the
 * Home view presentational: everything dynamic is computed here from contract
 * data (medication shot cycle + profile daily targets + today's logs).
 *
 * The shot-cycle coaching copy is a small, explainable heuristic keyed off the
 * real days-since-shot. It stands in until a backend "today hero" contract
 * exists; when it does, swap `shotPhase()` for that field.
 */

export type ShotEnergy = "good" | "mid" | "low";

export interface TodayView {
  /** "Tuesday, Jun 2 · Day 44 on Wegovy" */
  contextLabel: string;
  /** Daily hero card — reuses VerdictCard styling via `tone`. */
  hero: {
    tone: VerdictStatus;
    pill: string;
    headline: string;
    message: string;
    actionLabel: string;
  };
  protein: { logged: number; target: number; ratio: number };
  session: { done: number; target: number; ratio: number };
  /** Next-dose countdown tile; hidden when the user isn't on a protocol. */
  nextShot: { label: string; onProtocol: boolean };
  loggedMeals: TodayLog["meals"];
}

const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86_400_000));
}

export interface ShotPhase {
  energy: ShotEnergy;
  energyLabel: string;
  headline: string;
  message: string;
}

export interface ShotCycle {
  daysSinceShot: number;
  daysUntilNext: number;
  dayOnMed: number;
  nextShotDayName: string; // weekday the next shot lands on, e.g. "Sunday"
  phase: ShotPhase;
}

/**
 * Maps days-since-shot to the day's energy window and coaching line. GLP-1
 * appetite/energy typically dips for a day or two after the dose, then returns
 * mid-cycle — so that's the easy window to bank protein and a session.
 */
function shotPhase(daysSinceShot: number): ShotPhase {
  switch (daysSinceShot) {
    case 0:
      return {
        energy: "mid",
        energyLabel: "EASE IN",
        headline: "Shot day. Keep it gentle.",
        message: "Energy and appetite can dip over the next day or two. Hydrate and keep protein easy.",
      };
    case 1:
      return {
        energy: "low",
        energyLabel: "LOW ENERGY",
        headline: "Go easy today.",
        message: "The day after your shot is often the quietest for appetite. Small, protein-first bites win.",
      };
    case 2:
    case 3:
      return {
        energy: "good",
        energyLabel: "GOOD ENERGY",
        headline: "Bank it while energy's back.",
        message: "A couple days after your shot, appetite returns. Today's the easy day to hit protein and train.",
      };
    default:
      return {
        energy: "good",
        energyLabel: "STEADY",
        headline: "Steady stretch. Keep stacking protein.",
        message: "Energy's level this far into the cycle. Protein and a session keep the muscle you've got.",
      };
  }
}

/** Shared shot-cycle math — used by both the daily Home hero and Today's plan. */
export function computeShotCycle(medication: UserMedicationProtocol, now: Date): ShotCycle {
  const today = now.getDay();
  // Split-dose protocols inject on several days. The cycle keys off the MOST
  // RECENT past shot (smallest days-since) and the SOONEST upcoming shot.
  const shots = medication.shotDays.map((day) => WEEKDAY_INDEX[day]);
  const daysSinceShot = shots.length ? Math.min(...shots.map((shot) => (today - shot + 7) % 7)) : 0;
  let daysUntilNext = 7;
  let nextShot = shots[0] ?? today;
  for (const shot of shots) {
    const until = ((shot - today + 7) % 7) || 7;
    if (until <= daysUntilNext) {
      daysUntilNext = until;
      nextShot = shot;
    }
  }
  return {
    daysSinceShot,
    daysUntilNext,
    dayOnMed: daysSince(medication.startDate, now),
    nextShotDayName: WEEKDAYS_LONG[nextShot],
    phase: shotPhase(daysSinceShot),
  };
}

/**
 * The between-sets rest cue, tuned to the shot cycle so the player coaches the
 * same shot-aware story as the rest of the app. `null` energy (off-protocol)
 * gets a neutral line.
 */
export function restCueForEnergy(energy: ShotEnergy | null): string {
  switch (energy) {
    case "good":
      return "Post-shot energy is good today, so you've got the next set.";
    case "mid":
      return "Hydrate while you rest. Keep the next set steady and controlled.";
    case "low":
      return "Take your time. Breathe and ease into the next set.";
    default:
      return "Breathe and shake out the arms. You've got the next set.";
  }
}

/** Energy maps to a calm card tone — never red. */
const ENERGY_TONE: Record<ShotEnergy, VerdictStatus> = {
  good: "on_track",
  mid: "drifting",
  low: "drifting",
};

export function deriveTodayView(args: {
  profile: UserProfile;
  medication?: UserMedicationProtocol;
  recommendedWorkouts: Workout[];
  dailyLog: TodayLog;
  now: Date;
}): TodayView {
  const { profile, medication, recommendedWorkouts, dailyLog, now } = args;

  const dateLabel = `${WEEKDAYS_LONG[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  // Shot cycle (only when on a protocol).
  let contextLabel = dateLabel;
  let pill = "TODAY";
  let phase = shotPhase(99); // steady-state default when off protocol
  let nextShot: TodayView["nextShot"] = { label: "—", onProtocol: false };

  if (medication) {
    const cycle = computeShotCycle(medication, now);
    phase = cycle.phase;
    contextLabel = `${dateLabel} · Day ${cycle.dayOnMed} on ${medication.medicationName}`;
    pill = `${cycle.daysSinceShot === 0 ? "SHOT DAY" : `SHOT +${cycle.daysSinceShot}`} · ${phase.energyLabel}`;
    nextShot = {
      label: cycle.daysUntilNext === 0 ? "Today" : `in ${plural(cycle.daysUntilNext, "day")}`,
      onProtocol: true,
    };
  }

  // Daily protein: logged sums today's meals; target from profile.
  const proteinLogged = dailyLog.meals.reduce((sum, m) => sum + m.grams, 0);
  const proteinTarget = profile.dailyProteinTarget;

  // Today's session: the day's training goal is one session for anyone who
  // trains (a recommended workout today, or a non-zero weekly target). Done
  // comes from today's logs.
  const trains = recommendedWorkouts.length > 0 || profile.weeklyWorkoutTarget > 0;
  const sessionTarget = trains ? 1 : 0;
  const sessionDone = dailyLog.workoutsDone;

  return {
    contextLabel,
    hero: {
      tone: ENERGY_TONE[phase.energy],
      pill,
      headline: phase.headline,
      message: phase.message,
      actionLabel: "See today's plan",
    },
    protein: {
      logged: proteinLogged,
      target: proteinTarget,
      ratio: clamp01(proteinTarget ? proteinLogged / proteinTarget : 0),
    },
    session: {
      done: sessionDone,
      target: sessionTarget,
      ratio: clamp01(sessionTarget ? sessionDone / sessionTarget : 0),
    },
    nextShot,
    loggedMeals: dailyLog.meals,
  };
}
