import type { MuscleRetentionLabel, MuscleRetentionSnapshot } from "@leanient/shared";

/**
 * Builds a real week-over-week comparison from the muscle-retention snapshots
 * (this week vs the prior week): retention label shift plus protein, training,
 * and weight deltas. Powers the "What changed" view after a check-in.
 */

const RETENTION_TEXT: Record<MuscleRetentionLabel, string> = {
  keeping_muscle: "Keeping muscle",
  maintaining: "Maintaining",
  losing_some: "Losing some",
  losing_muscle: "Losing muscle",
};

// Higher rank = better retention, so we can tell improvement from regression.
const RETENTION_RANK: Record<MuscleRetentionLabel, number> = {
  losing_muscle: 0,
  losing_some: 1,
  maintaining: 2,
  keeping_muscle: 3,
};

export type ChangeTone = "up" | "down" | "flat";

export interface ChangeRow {
  key: string;
  label: string;
  value: string; // this week's value
  delta: string | null; // vs last week, null when there's no prior week
  tone: ChangeTone;
}

export interface WhatChangedView {
  hasPrior: boolean;
  retentionLabel: string; // this week's retention label
  retentionShift: string | null; // "from Maintaining" when the label changed
  retentionTone: ChangeTone;
  rows: ChangeRow[];
}

function toneOf(delta: number): ChangeTone {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function signed(delta: number, singular: string, plural: string): string {
  if (delta === 0) return "No change";
  const unit = Math.abs(delta) === 1 ? singular : plural;
  return `${delta > 0 ? "+" : ""}${delta} ${unit}`;
}

function signedUnit(delta: number, unit: string, digits = 0): string {
  if (delta === 0) return "No change";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(digits)} ${unit}`;
}

export function buildWhatChanged(snapshots: MuscleRetentionSnapshot[]): WhatChangedView | null {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime(),
  );
  const cur = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : undefined;

  const curProtein = Math.round(cur.inputsUsed.avgDailyProteinGrams);
  const prevProtein = prev ? Math.round(prev.inputsUsed.avgDailyProteinGrams) : 0;
  const curSessions = cur.inputsUsed.sessionsCompleted;
  const prevSessions = prev ? prev.inputsUsed.sessionsCompleted : 0;
  const curLoss = cur.weeklyWeightLossLb;
  const prevLoss = prev ? prev.weeklyWeightLossLb : 0;

  const rows: ChangeRow[] = [
    {
      key: "protein",
      label: "Avg protein",
      value: `${curProtein} g/day`,
      delta: prev ? signedUnit(curProtein - prevProtein, "g/day") : null,
      tone: prev ? toneOf(curProtein - prevProtein) : "flat",
    },
    {
      key: "training",
      label: "Workouts",
      value: `${curSessions} of ${cur.inputsUsed.weeklyWorkoutTarget}`,
      delta: prev ? signed(curSessions - prevSessions, "session", "sessions") : null,
      tone: prev ? toneOf(curSessions - prevSessions) : "flat",
    },
    {
      key: "weight",
      label: "Weight lost",
      value: `${curLoss.toFixed(1)} lb`,
      // Weight change is informational on its own, so it reads neutral.
      delta: prev ? signedUnit(curLoss - prevLoss, "lb", 1) : null,
      tone: "flat",
    },
  ];

  const retentionTone: ChangeTone = prev
    ? toneOf(RETENTION_RANK[cur.retentionLabel] - RETENTION_RANK[prev.retentionLabel])
    : "flat";

  return {
    hasPrior: Boolean(prev),
    retentionLabel: RETENTION_TEXT[cur.retentionLabel],
    retentionShift:
      prev && prev.retentionLabel !== cur.retentionLabel
        ? `from ${RETENTION_TEXT[prev.retentionLabel]}`
        : null,
    retentionTone,
    rows,
  };
}
