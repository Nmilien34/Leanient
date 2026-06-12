import type {
  DoseLog,
  MealLog,
  UserMedicationProtocol,
  UserProfile,
  WeeklyVerdict,
  WeightLog,
  Weekday,
} from "@leanient/shared";
import { weekStartIso } from "./weeklyCheckin";

/**
 * FRONTEND-ONLY display aggregate for the Home metrics, derived from contract
 * data (verdict + profile + weight logs + medication). Keeping the derivation in
 * one typed place means the Home view stays presentational and the rings are
 * genuinely data-driven.
 */
export interface HomeMetrics {
  protein: { logged: number; target: number; ratio: number };
  training: { done: number; target: number; ratio: number };
  weight: {
    current: number;
    unit: string;
    series: number[];
    delta4wk: number;
    /** Change anchored to the current week; null when nothing was weighed this week. */
    weekDelta: number | null;
  };
  dose: { lastLabel: string; nextLabel: string };
  measurements: { waist?: number; arm?: number };
}

const WEEKDAY_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function daysSinceDate(date: Date, now: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

function latestDoseLog(doseLogs: DoseLog[] | undefined): DoseLog | null {
  if (!doseLogs?.length) return null;
  return [...doseLogs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] ?? null;
}

function doseLabels(
  shotDays: Weekday[] | undefined,
  now: Date,
  doseLogs?: DoseLog[],
): { lastLabel: string; nextLabel: string } {
  if (!shotDays || shotDays.length === 0) return { lastLabel: "—", nextLabel: "—" };
  const today = now.getDay();
  // Most recent past shot and soonest upcoming shot across all injection days.
  const shots = shotDays.map((day) => WEEKDAY_INDEX[day]);
  const sinceLast = Math.min(...shots.map((shot) => (today - shot + 7) % 7));
  const untilNext = Math.min(...shots.map((shot) => ((shot - today + 7) % 7) || 7));
  const loggedDose = latestDoseLog(doseLogs);
  let lastLabel = sinceLast === 0 ? "Today" : `${plural(sinceLast, "day")} ago`;

  if (loggedDose) {
    const loggedAt = new Date(loggedDose.recordedAt);
    if (!Number.isNaN(loggedAt.getTime())) {
      const loggedDaysAgo = daysSinceDate(loggedAt, now);
      lastLabel = loggedDaysAgo === 0 ? "Today" : `${plural(loggedDaysAgo, "day")} ago`;
    }
  }

  return {
    lastLabel,
    nextLabel: untilNext === 0 ? "Today" : `in ${plural(untilNext, "day")}`,
  };
}

export function deriveHomeMetrics(args: {
  verdict: WeeklyVerdict;
  profile: UserProfile;
  weightLogs: WeightLog[];
  medication?: UserMedicationProtocol;
  doseLogs?: DoseLog[];
  measurements?: { waist?: number; arm?: number };
  /** This week's meal logs; when present they beat the verdict snapshot. */
  weekMeals?: Pick<MealLog, "protein">[];
  /** Live session count from the training endpoint (workout logs). */
  sessionsThisWeek?: number | null;
  now: Date;
}): HomeMetrics {
  const { verdict, profile, weightLogs, medication, doseLogs, measurements, weekMeals, sessionsThisWeek, now } = args;
  const inputs = verdict.inputsUsed;

  // Live logs first, the last verdict's snapshot second. The snapshot is a
  // week-old self-report; showing it as "this week" froze the rings and let a
  // tapped-through check-in render as a full protein ring.
  const proteinTarget = profile.dailyProteinTarget * 7;
  const proteinLogged =
    weekMeals && weekMeals.length > 0
      ? Math.round(weekMeals.reduce((sum, m) => sum + m.protein, 0))
      : Math.round((inputs?.proteinGramsPerDay ?? 0) * 7);

  const trainingTarget = profile.weeklyWorkoutTarget;
  const trainingDone = sessionsThisWeek ?? inputs?.resistanceWorkoutsCompleted ?? 0;

  const series = weightLogs.map((w) => w.value);
  const current = series.length ? series[series.length - 1] : (inputs?.weight?.value ?? profile.goalWeight);
  const delta4wk = series.length >= 2 ? current - series[0] : 0;
  const unit = weightLogs[weightLogs.length - 1]?.unit ?? inputs?.weight?.unit ?? profile.goalWeightUnit;
  const weekDelta = weighInDeltaThisWeek(weightLogs, now);

  return {
    protein: { logged: proteinLogged, target: proteinTarget, ratio: clamp01(proteinLogged / proteinTarget) },
    training: {
      done: trainingDone,
      target: trainingTarget,
      ratio: clamp01(trainingTarget ? trainingDone / trainingTarget : 0),
    },
    weight: { current, unit, series, delta4wk, weekDelta },
    dose: doseLabels(medication?.shotDays, now, doseLogs),
    measurements: measurements ?? {},
  };
}

/**
 * Weight change for the week `now` falls in: latest weigh-in vs the last one
 * before the week started (or the week's first weigh-in when there is no
 * earlier history). Null when nothing was logged this week, so the tile can
 * say so instead of pretending an old delta happened this week.
 */
export function weighInDeltaThisWeek(weightLogs: WeightLog[], now: Date): number | null {
  const sorted = [...weightLogs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const weekStart = `${weekStartIso(now)}T00:00:00.000Z`;
  const thisWeek = sorted.filter((w) => w.measuredAt >= weekStart);
  if (thisWeek.length === 0) return null;

  const latest = thisWeek[thisWeek.length - 1];
  const baseline = sorted.filter((w) => w.measuredAt < weekStart).pop() ?? thisWeek[0];
  return latest.value - baseline.value;
}
