import type {
  MuscleRetentionLabel,
  MuscleRetentionSnapshot,
  TrainingTodayResponse,
  WeightLog,
  WeightUnit,
} from "@leanient/shared";

export interface ProgressChartPoint {
  value: number;
  color?: string;
}

interface WeightChartArgs {
  weightLogs: WeightLog[];
  fallbackUnit: WeightUnit;
  goalWeight: number | null | undefined;
}

export function buildProgressWeightChart({ weightLogs, fallbackUnit, goalWeight }: WeightChartArgs): {
  points: ProgressChartPoint[];
  unit: WeightUnit;
  startWeight: number;
  todayWeight: number;
  lost: number;
  goalWeight: number;
} {
  const sorted = [...weightLogs].sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  const latest = sorted[sorted.length - 1];
  const startWeight = sorted[0]?.value ?? 0;
  const todayWeight = latest?.value ?? 0;
  const unit = latest?.unit ?? fallbackUnit;

  return {
    points: sorted.map((log) => ({ value: log.value })),
    unit,
    startWeight,
    todayWeight,
    lost: Math.max(0, startWeight - todayWeight),
    goalWeight: goalWeight ?? todayWeight,
  };
}

export function buildProgressRetentionChart(
  snapshots: MuscleRetentionSnapshot[],
  colorForLabel?: (label: MuscleRetentionLabel) => string,
): {
  snapshots: MuscleRetentionSnapshot[];
  points: ProgressChartPoint[];
  currentLabel: MuscleRetentionLabel | null;
} {
  const sorted = [...snapshots].sort((left, right) => left.weekOf.localeCompare(right.weekOf));
  const latest = sorted[sorted.length - 1];

  return {
    snapshots: sorted,
    points: sorted.map((snapshot) => ({
      value: snapshot.muscleRetentionScore,
      color: colorForLabel?.(snapshot.retentionLabel),
    })),
    currentLabel: latest?.retentionLabel ?? null,
  };
}

export function buildWorkoutSessionsCard(
  trainingToday: Pick<TrainingTodayResponse, "sessionsThisWeek" | "weeklyTarget"> | null,
): {
  eyebrow: string;
  title: string;
  detail: string;
  cta: string;
} {
  return {
    eyebrow: "TRAINING PROOF",
    title: "Workout sessions",
    detail: trainingToday
      ? `${trainingToday.sessionsThisWeek} of ${trainingToday.weeklyTarget} sessions this week`
      : "Review every completed workout",
    cta: "View history",
  };
}
