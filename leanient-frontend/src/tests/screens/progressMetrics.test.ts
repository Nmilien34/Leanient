import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot, WeightLog } from "@leanient/shared";
import {
  buildProgressRetentionChart,
  buildProgressWeightChart,
  buildWorkoutSessionsCard,
  chartRangeTitle,
  filterByChartRange,
  muscleKeptStreak,
} from "../../screens/app/progressMetrics";

const STAMP = "2026-06-09T12:00:00.000Z";

function weightLog(overrides: Partial<WeightLog>): WeightLog {
  return {
    id: "weight_1",
    userId: "user_1",
    value: 190,
    unit: "lb",
    measuredAt: STAMP,
    source: "manual",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

function snapshot(overrides: Partial<MuscleRetentionSnapshot>): MuscleRetentionSnapshot {
  return {
    id: "snapshot_1",
    userId: "user_1",
    weekOf: "2026-06-01T00:00:00.000Z",
    proteinScore: 80,
    trainingScore: 90,
    paceScore: 85,
    muscleRetentionScore: 88,
    retentionLabel: "keeping_muscle",
    weeklyWeightLossLb: 1.2,
    cumulativeWeightLossLb: 6.4,
    inputsUsed: {
      avgDailyProteinGrams: 120,
      sessionsCompleted: 3,
      weeklyWorkoutTarget: 3,
      dailyProteinTarget: 120,
      startWeight: 190,
      endWeight: 188.8,
      dataSource: {
        protein: "logs",
        training: "logs",
        weight: "logs",
      },
    },
    engineVersion: "muscle-retention-v1",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

describe("buildProgressWeightChart", () => {
  it("uses logged weights in measuredAt order", () => {
    const chart = buildProgressWeightChart({
      weightLogs: [
        weightLog({ value: 184, measuredAt: "2026-06-08T12:00:00.000Z" }),
        weightLog({ value: 190, measuredAt: "2026-05-01T12:00:00.000Z" }),
        weightLog({ value: 187, measuredAt: "2026-05-20T12:00:00.000Z" }),
      ],
      fallbackUnit: "lb",
      goalWeight: 170,
    });

    expect(chart.points.map((point) => point.value)).toEqual([190, 187, 184]);
    expect(chart.startWeight).toBe(190);
    expect(chart.todayWeight).toBe(184);
    expect(chart.lost).toBe(6);
    expect(chart.unit).toBe("lb");
  });
});

describe("buildProgressRetentionChart", () => {
  it("uses real retention snapshot scores in week order", () => {
    const chart = buildProgressRetentionChart([
      snapshot({ weekOf: "2026-06-08T00:00:00.000Z", muscleRetentionScore: 72, retentionLabel: "losing_some" }),
      snapshot({ weekOf: "2026-06-01T00:00:00.000Z", muscleRetentionScore: 91, retentionLabel: "keeping_muscle" }),
    ]);

    expect(chart.snapshots.map((item) => item.weekOf)).toEqual([
      "2026-06-01T00:00:00.000Z",
      "2026-06-08T00:00:00.000Z",
    ]);
    expect(chart.points.map((point) => point.value)).toEqual([91, 72]);
  });
});

describe("filterByChartRange", () => {
  const now = new Date("2026-06-09T12:00:00.000Z");
  const logs = [
    weightLog({ id: "old", measuredAt: "2025-05-01T12:00:00.000Z" }), // ~13 months back
    weightLog({ id: "mid", measuredAt: "2026-04-01T12:00:00.000Z" }), // ~10 weeks back
    weightLog({ id: "new", measuredAt: "2026-06-01T12:00:00.000Z" }), // 8 days back
  ];

  it("keeps only entries inside the window", () => {
    expect(filterByChartRange(logs, (l) => l.measuredAt, "30d", now).map((l) => l.id)).toEqual(["new"]);
    expect(filterByChartRange(logs, (l) => l.measuredAt, "90d", now).map((l) => l.id)).toEqual(["mid", "new"]);
    expect(filterByChartRange(logs, (l) => l.measuredAt, "1y", now).map((l) => l.id)).toEqual(["mid", "new"]);
    expect(filterByChartRange(logs, (l) => l.measuredAt, "all", now)).toHaveLength(3);
  });

  it("titles each window for the delta caption", () => {
    expect(chartRangeTitle("30d")).toBe("last 30 days");
    expect(chartRangeTitle("all")).toBe("since start");
  });
});

describe("muscleKeptStreak", () => {
  const week = (weekOf: string, retentionLabel: MuscleRetentionSnapshot["retentionLabel"]) =>
    snapshot({ id: weekOf, weekOf, retentionLabel });

  it("counts trailing protected weeks regardless of input order", () => {
    const weeks = [
      week("2026-05-25T00:00:00.000Z", "keeping_muscle"),
      week("2026-05-04T00:00:00.000Z", "losing_some"),
      week("2026-06-01T00:00:00.000Z", "maintaining"),
      week("2026-05-11T00:00:00.000Z", "keeping_muscle"),
      week("2026-05-18T00:00:00.000Z", "maintaining"),
    ];
    // losing_some on May 4 breaks the streak; the four weeks after it count.
    expect(muscleKeptStreak(weeks)).toBe(4);
  });

  it("is zero when the latest week lost muscle and when there is no data", () => {
    expect(muscleKeptStreak([week("2026-06-01T00:00:00.000Z", "losing_muscle")])).toBe(0);
    expect(muscleKeptStreak([])).toBe(0);
  });
});

describe("buildWorkoutSessionsCard", () => {
  it("shows this week's real session count when training data is loaded", () => {
    expect(
      buildWorkoutSessionsCard({
        sessionsThisWeek: 2,
        weeklyTarget: 3,
      }),
    ).toEqual({
      eyebrow: "TRAINING PROOF",
      title: "Workout sessions",
      detail: "2 of 3 sessions this week",
      cta: "View history",
    });
  });

  it("falls back to a history-focused line before training data loads", () => {
    expect(buildWorkoutSessionsCard(null).detail).toBe("Review every completed workout");
  });
});
