import type {
  MealLog,
  SideEffectSymptom,
  WeeklyCheckinRequest,
  WeeklyVerdict,
  WeightLog,
  WeightUnit,
  WorkoutLog,
} from "@leanient/shared";

/**
 * Pure helpers for the weekly check-in. The backend prefers this week's logged
 * data when computing the verdict (`resolveWeeklyVerdictInputs`): logged protein
 * and resistance counts win, and the typed form values are only a fallback for
 * users who did not log. So the form pre-fills from logs as a confirmation and
 * only asks for fresh entry when a section has no logs this week.
 */

/** Monday-start of the current week (UTC) as YYYY-MM-DD. Matches backend `startOfUtcWeek`. */
export function weekStartIso(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

/** UTC [from, to) range covering the week that `now` falls in. */
export function weekRange(now: Date): { from: string; to: string } {
  const start = new Date(`${weekStartIso(now)}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Average protein per logged day (sum / distinct days with meals), rounded. Mirrors the backend. */
export function proteinAvgPerLoggedDay(meals: Pick<MealLog, "protein" | "recordedAt">[]): number {
  if (meals.length === 0) return 0;
  const days = new Set(meals.map((m) => m.recordedAt.slice(0, 10)));
  const total = meals.reduce((sum, m) => sum + m.protein, 0);
  return Math.round(total / days.size);
}

/** Count of resistance-flagged workouts. */
export function resistanceCount(workouts: Pick<WorkoutLog, "countsAsResistance">[]): number {
  return workouts.filter((w) => w.countsAsResistance).length;
}

export interface CheckinPrefill {
  weightValue: number | null;
  weightUnit: WeightUnit;
  proteinGramsPerDay: number;
  proteinFromLogs: boolean;
  mealCount: number;
  resistanceWorkoutsCompleted: number;
  workoutsFromLogs: boolean;
}

export function deriveCheckinPrefill(args: {
  weightLogs: WeightLog[];
  weekMeals: MealLog[];
  weekWorkouts: WorkoutLog[];
  fallbackUnit: WeightUnit;
  fallbackProtein?: number;
}): CheckinPrefill {
  const latestWeight = [...args.weightLogs].sort((a, b) => (a.measuredAt < b.measuredAt ? 1 : -1))[0];
  const proteinFromLogs = args.weekMeals.length > 0;
  const workoutsFromLogs = args.weekWorkouts.length > 0;
  return {
    weightValue: latestWeight?.value ?? null,
    weightUnit: latestWeight?.unit ?? args.fallbackUnit,
    proteinGramsPerDay: proteinFromLogs
      ? proteinAvgPerLoggedDay(args.weekMeals)
      : (args.fallbackProtein ?? 0),
    proteinFromLogs,
    mealCount: args.weekMeals.length,
    resistanceWorkoutsCompleted: workoutsFromLogs ? resistanceCount(args.weekWorkouts) : 0,
    workoutsFromLogs,
  };
}

export function buildCheckinRequest(args: {
  now: Date;
  weight: { value: number; unit: WeightUnit };
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  sideEffects: SideEffectSymptom[];
  notes?: string;
}): WeeklyCheckinRequest {
  const trimmedNotes = args.notes?.trim();
  return {
    weekOf: weekStartIso(args.now),
    weight: {
      value: args.weight.value,
      unit: args.weight.unit,
      measuredAt: args.now.toISOString(),
    },
    proteinGramsPerDay: args.proteinGramsPerDay,
    resistanceWorkoutsCompleted: args.resistanceWorkoutsCompleted,
    sideEffects: args.sideEffects,
    ...(trimmedNotes ? { notes: trimmedNotes } : {}),
  };
}

export async function runWeeklyCheckinSubmit(args: {
  submitRequest: () => Promise<WeeklyVerdict>;
  refreshHomeData: () => Promise<void>;
  onComplete: (verdict: WeeklyVerdict) => void;
  onError: (message: string) => void;
  errorMessage: (error: unknown) => string;
}): Promise<boolean> {
  let verdict: WeeklyVerdict;

  try {
    verdict = await args.submitRequest();
  } catch (error) {
    args.onError(args.errorMessage(error));
    return false;
  }

  try {
    await args.refreshHomeData();
  } catch {
    // The check-in is already persisted. A home refresh miss should not turn a
    // successful submission into a failed form state.
  }

  args.onComplete(verdict);
  return true;
}
