import type { ProgressOverviewResponse } from "@leanient/shared";
import { classifyDrug, leanFractionFor } from "./firstJourney";

/**
 * FRONTEND-ONLY view model for the Home "body composition" hero. Turns the
 * engine's fat/muscle estimate (from the progress overview) into the quantified
 * story: of the weight you've lost, how much was fat vs lean mass, and how that
 * split compares to the typical share for *their drug* (see
 * docs/glp1-clinical-reference.md) — surfacing the muscle they've protected.
 */

export interface BodyCompositionView {
  totalLostLb: number;
  fatLostLb: number;
  muscleLostLb: number;
  /** Fat share of loss for the split bar, 0-100. */
  fatPct: number;
  musclePct: number;
  /** Drug shown in the comparison ("Wegovy" or "GLP-1s"). */
  drugLabel: string;
  /** Typical muscle share of loss for this drug, 0-100 (semaglutide ~40, tirzepatide ~25). */
  baselineMusclePct: number;
  /** Lbs of the loss that would typically be muscle on this drug. */
  typicalMuscleLostLb: number;
  /** Lbs of muscle protected vs the drug average (0 when behind). */
  protectedLb: number;
  /** "76% of your loss has been fat." */
  headline: string;
  /** One line comparing the split to the drug's typical muscle share. */
  comparison: string;
  /** "12.4 lb lost over 8 weeks" */
  context: string;
  /** True when the user is keeping more muscle than the drug average. */
  aheadOfAverage: boolean;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Build the hero view, or null when there's no loss story yet (a brand-new user,
 * or someone who hasn't lost weight). The caller hides the card on null.
 */
export function buildBodyComposition(
  summary: ProgressOverviewResponse["summary"] | null | undefined,
): BodyCompositionView | null {
  if (!summary || summary.totalWeightLoss <= 0) return null;

  const totalLostLb = Number(summary.totalWeightLoss.toFixed(1));
  const fatLostLb = Number(summary.estimatedFatLostLb.toFixed(1));
  const muscleLostLb = Number(summary.estimatedMuscleLostLb.toFixed(1));
  const fatPct = Math.round(summary.fatShareOfLossPct);
  const musclePct = Math.max(0, 100 - fatPct);

  // Drug-aware baseline: what share of loss is typically muscle on *this* drug
  // (semaglutide ~40%, tirzepatide ~25%, unknown ~33%). The user beats it by
  // keeping a smaller muscle share than the drug average.
  const drugLabel = summary.medicationName?.trim() ? summary.medicationName.trim() : "GLP-1s";
  const baselineMusclePct = Math.round(leanFractionFor(classifyDrug(summary.medicationName)) * 100);
  const typicalMuscleLostLb = Number(((baselineMusclePct / 100) * totalLostLb).toFixed(1));
  const protectedLb = Number(Math.max(0, typicalMuscleLostLb - muscleLostLb).toFixed(1));
  const aheadOfAverage = musclePct < baselineMusclePct;

  const weeks = summary.weeksOnProtocol;
  const context = weeks > 0 ? `${totalLostLb} lb lost over ${plural(weeks, "week")}` : `${totalLostLb} lb lost so far`;

  const comparison = aheadOfAverage
    ? `On ${drugLabel}, about ${typicalMuscleLostLb} lb of that would usually be muscle. You've held it to ${muscleLostLb} — roughly ${protectedLb} lb protected.`
    : `On ${drugLabel}, around ${baselineMusclePct}% of lost weight is usually muscle. More protein and a session or two protects more of yours.`;

  return {
    totalLostLb,
    fatLostLb,
    muscleLostLb,
    fatPct,
    musclePct,
    drugLabel,
    baselineMusclePct,
    typicalMuscleLostLb,
    protectedLb,
    headline: `${fatPct}% of your loss has been fat.`,
    comparison,
    context,
    aheadOfAverage,
  };
}
