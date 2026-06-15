import { describe, expect, it } from "vitest";
import type { ProgressOverviewResponse } from "@leanient/shared";
import { buildBodyComposition } from "../../screens/app/bodyComp";

function summary(
  overrides: Partial<ProgressOverviewResponse["summary"]> = {},
): ProgressOverviewResponse["summary"] {
  return {
    weeksOnProtocol: 8,
    medicationName: "Wegovy",
    startingWeight: 196.4,
    currentWeight: 184,
    totalWeightLoss: 12.4,
    targetWeight: 165,
    remainingToTarget: 19,
    estimatedFatLostLb: 9.3,
    estimatedMuscleLostLb: 3.1,
    fatShareOfLossPct: 75,
    ...overrides,
  };
}

describe("buildBodyComposition", () => {
  it("returns null when there's no loss story yet", () => {
    expect(buildBodyComposition(null)).toBeNull();
    expect(buildBodyComposition(summary({ totalWeightLoss: 0 }))).toBeNull();
    expect(buildBodyComposition(summary({ totalWeightLoss: -1 }))).toBeNull();
  });

  it("builds the fat/muscle split with a weeks context line", () => {
    const view = buildBodyComposition(summary());
    expect(view).not.toBeNull();
    expect(view!.totalLostLb).toBe(12.4);
    expect(view!.fatLostLb).toBe(9.3);
    expect(view!.muscleLostLb).toBe(3.1);
    expect(view!.fatPct).toBe(75);
    expect(view!.musclePct).toBe(25);
    expect(view!.headline).toBe("75% of your loss has been fat.");
    expect(view!.context).toBe("12.4 lb lost over 8 weeks");
  });

  it("frames a better-than-average split as muscle protected, and a worse one as a nudge", () => {
    // Wegovy = semaglutide → ~40% baseline muscle share.
    const ahead = buildBodyComposition(summary({ fatShareOfLossPct: 80 })); // 20% muscle < 40%
    expect(ahead!.aheadOfAverage).toBe(true);
    expect(ahead!.baselineMusclePct).toBe(40);
    expect(ahead!.comparison).toContain("protected");
    expect(ahead!.comparison).toContain("Wegovy");

    const behind = buildBodyComposition(summary({ fatShareOfLossPct: 55 })); // 45% muscle > 40%
    expect(behind!.aheadOfAverage).toBe(false);
    expect(behind!.comparison).toContain("More protein");
  });

  it("sizes muscle protected against the drug's typical share", () => {
    // 12.4 lb lost, semaglutide ~40% → ~5.0 lb typically muscle; actual 3.1 → ~1.9 protected.
    const view = buildBodyComposition(summary({ fatShareOfLossPct: 80 }))!;
    expect(view.typicalMuscleLostLb).toBe(5);
    expect(view.protectedLb).toBe(1.9);

    // Tirzepatide preserves better → lower baseline, so the same split clears a lower bar.
    const tirz = buildBodyComposition(summary({ medicationName: "Mounjaro", fatShareOfLossPct: 80 }))!;
    expect(tirz.baselineMusclePct).toBe(25);
    expect(tirz.drugLabel).toBe("Mounjaro");
  });

  it("singularizes the week count", () => {
    expect(buildBodyComposition(summary({ weeksOnProtocol: 1 }))!.context).toBe("12.4 lb lost over 1 week");
    expect(buildBodyComposition(summary({ weeksOnProtocol: 0 }))!.context).toBe("12.4 lb lost so far");
  });
});
