import type { DoseLog, MuscleRetentionSnapshot } from "@leanient/shared";

/**
 * FRONTEND-ONLY insight connecting the dose to the muscle story. As a GLP-1 dose
 * climbs, appetite drops and protein gets harder — which is exactly when muscle
 * is most at risk. This finds the most recent dose increase and compares the
 * weekly protein-adherence score (already on every snapshot) before vs after it,
 * so the dose stops being a passive log and becomes part of the verdict.
 */

// A protein-adherence move smaller than this is within week-to-week noise.
const MEANINGFUL_DROP = 5;

export interface DoseProteinInsight {
  direction: "dropped" | "held";
  fromDose: number;
  toDose: number;
  doseUnit: string;
  weeksSince: number;
  beforePct: number;
  afterPct: number;
  headline: string;
  body: string;
}

interface DoseIncrease {
  date: string;
  fromDose: number;
  toDose: number;
  doseUnit: string;
}

/** The most recent point where the logged dose stepped up. */
function latestDoseIncrease(doseLogs: Pick<DoseLog, "doseAmount" | "doseUnit" | "recordedAt">[]): DoseIncrease | null {
  const sorted = [...doseLogs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  let increase: DoseIncrease | null = null;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].doseAmount > sorted[i - 1].doseAmount) {
      increase = {
        date: sorted[i].recordedAt,
        fromDose: sorted[i - 1].doseAmount,
        toDose: sorted[i].doseAmount,
        doseUnit: sorted[i].doseUnit,
      };
    }
  }
  return increase;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function buildDoseProteinInsight(args: {
  doseLogs: Pick<DoseLog, "doseAmount" | "doseUnit" | "recordedAt">[];
  snapshots: Pick<MuscleRetentionSnapshot, "proteinScore" | "weekOf">[];
  now: Date;
}): DoseProteinInsight | null {
  const increase = latestDoseIncrease(args.doseLogs);
  if (!increase) return null;

  const before = args.snapshots.filter((s) => s.weekOf < increase.date).map((s) => s.proteinScore);
  const after = args.snapshots.filter((s) => s.weekOf >= increase.date).map((s) => s.proteinScore);
  // Need adherence data on both sides of the bump to make the comparison honest.
  if (before.length === 0 || after.length === 0) return null;

  const beforePct = Math.round(average(before));
  const afterPct = Math.round(average(after));
  const weeksSince = Math.max(
    1,
    Math.floor((args.now.getTime() - new Date(increase.date).getTime()) / (7 * 86_400_000)),
  );
  const dropped = afterPct <= beforePct - MEANINGFUL_DROP;
  const dose = `${increase.toDose} ${increase.doseUnit}`;

  if (dropped) {
    return {
      direction: "dropped",
      fromDose: increase.fromDose,
      toDose: increase.toDose,
      doseUnit: increase.doseUnit,
      weeksSince,
      beforePct,
      afterPct,
      headline: "Protein slipped since your dose increase",
      body: `Your protein held at ${beforePct}% before your bump to ${dose} ${weeksSince} ${weeksSince === 1 ? "week" : "weeks"} ago, and it's ${afterPct}% since. A higher dose curbs appetite right when muscle is most at risk. Getting protein back to target protects it.`,
    };
  }

  return {
    direction: "held",
    fromDose: increase.fromDose,
    toDose: increase.toDose,
    doseUnit: increase.doseUnit,
    weeksSince,
    beforePct,
    afterPct,
    headline: "You're handling the higher dose",
    body: `You moved to ${dose} ${weeksSince} ${weeksSince === 1 ? "week" : "weeks"} ago and kept protein at ${afterPct}%. That's how you ride a dose increase without giving up muscle.`,
  };
}
