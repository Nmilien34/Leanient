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

/**
 * Time windows for the progress charts. `days: null` means the full history.
 * `title` feeds the delta caption ("down 14 lb {title}").
 */
export const CHART_RANGES = [
  { id: "30d", label: "30", days: 30, title: "last 30 days" },
  { id: "90d", label: "90", days: 90, title: "last 90 days" },
  { id: "1y", label: "1yr", days: 365, title: "past year" },
  { id: "all", label: "All", days: null, title: "since start" },
] as const;

export type ChartRangeId = (typeof CHART_RANGES)[number]["id"];

export function chartRangeTitle(range: ChartRangeId): string {
  return CHART_RANGES.find((r) => r.id === range)?.title ?? "since start";
}

/** Keep only items whose ISO date falls inside the chosen window. */
export function filterByChartRange<T>(
  items: T[],
  getDate: (item: T) => string,
  range: ChartRangeId,
  now: Date,
): T[] {
  const days = CHART_RANGES.find((r) => r.id === range)?.days ?? null;
  if (days == null) return items;
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  return items.filter((item) => getDate(item) >= cutoff);
}

const PROTECTED_LABELS: readonly MuscleRetentionLabel[] = ["keeping_muscle", "maintaining"];

/**
 * Consecutive most-recent weeks where the engine judged muscle protected
 * (keeping_muscle or maintaining). Powers the calm streak counter on the
 * Progress header; a single week is a data point, two or more is a streak.
 */
export function muscleKeptStreak(snapshots: MuscleRetentionSnapshot[]): number {
  const sorted = [...snapshots].sort((left, right) => left.weekOf.localeCompare(right.weekOf));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (!PROTECTED_LABELS.includes(sorted[i].retentionLabel)) break;
    streak += 1;
  }
  return streak;
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
