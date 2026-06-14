import type { ProgressOverviewResponse } from "@leanient/shared";

/**
 * FRONTEND-ONLY view model for the Home "body composition" hero. Turns the
 * engine's fat/muscle estimate (from the progress overview) into the quantified
 * story: of the weight you've lost, how much was fat vs lean mass, and how that
 * split compares to the unmanaged GLP-1 average.
 */

// PRODUCT_TUNING: published cohorts lose ~25-39% of weight as lean mass on
// GLP-1s without protein + resistance work, so the unmanaged split is roughly
// two-thirds fat. We compare the user against that to show the app is working.
const BASELINE_FAT_SHARE_PCT = 68;

export interface BodyCompositionView {
  totalLostLb: number;
  fatLostLb: number;
  muscleLostLb: number;
  /** Fat share of loss for the split bar, 0-100. */
  fatPct: number;
  musclePct: number;
  /** "76% of your loss has been fat." */
  headline: string;
  /** One line comparing the split to the GLP-1 average. */
  comparison: string;
  /** "12.4 lb lost over 8 weeks" */
  context: string;
  /** True when the user is beating the unmanaged GLP-1 split. */
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
  const aheadOfAverage = fatPct >= BASELINE_FAT_SHARE_PCT;

  const weeks = summary.weeksOnProtocol;
  const context = weeks > 0 ? `${totalLostLb} lb lost over ${plural(weeks, "week")}` : `${totalLostLb} lb lost so far`;

  const comparison = aheadOfAverage
    ? `Ahead of the GLP-1 average, where about a third of lost weight is muscle. Your protein is doing the work.`
    : `The GLP-1 average protects about ${BASELINE_FAT_SHARE_PCT}% as fat. More protein and a session or two protects more muscle.`;

  return {
    totalLostLb,
    fatLostLb,
    muscleLostLb,
    fatPct,
    musclePct,
    headline: `${fatPct}% of your loss has been fat.`,
    comparison,
    context,
    aheadOfAverage,
  };
}
