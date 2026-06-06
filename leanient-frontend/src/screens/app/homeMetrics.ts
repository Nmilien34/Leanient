import type { UserMedicationProtocol, UserProfile, WeeklyVerdict, WeightLog, Weekday } from "@leanient/shared";

/**
 * FRONTEND-ONLY display aggregate for the Home metrics, derived from contract
 * data (verdict + profile + weight logs + medication). Keeping the derivation in
 * one typed place means the Home view stays presentational and the rings are
 * genuinely data-driven.
 */
export interface HomeMetrics {
  protein: { logged: number; target: number; ratio: number };
  training: { done: number; target: number; ratio: number };
  weight: { current: number; unit: string; series: number[]; delta4wk: number };
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

function doseLabels(shotDays: Weekday[] | undefined, now: Date): { lastLabel: string; nextLabel: string } {
  if (!shotDays || shotDays.length === 0) return { lastLabel: "—", nextLabel: "—" };
  const today = now.getDay();
  // Most recent past shot and soonest upcoming shot across all injection days.
  const shots = shotDays.map((day) => WEEKDAY_INDEX[day]);
  const sinceLast = Math.min(...shots.map((shot) => (today - shot + 7) % 7));
  const untilNext = Math.min(...shots.map((shot) => ((shot - today + 7) % 7) || 7));
  return {
    lastLabel: sinceLast === 0 ? "Today" : `${plural(sinceLast, "day")} ago`,
    nextLabel: untilNext === 0 ? "Today" : `in ${plural(untilNext, "day")}`,
  };
}

export function deriveHomeMetrics(args: {
  verdict: WeeklyVerdict;
  profile: UserProfile;
  weightLogs: WeightLog[];
  medication?: UserMedicationProtocol;
  measurements?: { waist?: number; arm?: number };
  now: Date;
}): HomeMetrics {
  const { verdict, profile, weightLogs, medication, measurements, now } = args;
  const inputs = verdict.inputsUsed;

  const proteinTarget = profile.dailyProteinTarget * 7;
  const proteinLogged = Math.round((inputs?.proteinGramsPerDay ?? 0) * 7);

  const trainingTarget = profile.weeklyWorkoutTarget;
  const trainingDone = inputs?.resistanceWorkoutsCompleted ?? 0;

  const series = weightLogs.map((w) => w.value);
  const current = series.length ? series[series.length - 1] : (inputs?.weight?.value ?? profile.goalWeight);
  const delta4wk = series.length >= 2 ? current - series[0] : 0;
  const unit = weightLogs[weightLogs.length - 1]?.unit ?? inputs?.weight?.unit ?? profile.goalWeightUnit;

  return {
    protein: { logged: proteinLogged, target: proteinTarget, ratio: clamp01(proteinLogged / proteinTarget) },
    training: {
      done: trainingDone,
      target: trainingTarget,
      ratio: clamp01(trainingTarget ? trainingDone / trainingTarget : 0),
    },
    weight: { current, unit, series, delta4wk },
    dose: doseLabels(medication?.shotDays, now),
    measurements: measurements ?? {},
  };
}
