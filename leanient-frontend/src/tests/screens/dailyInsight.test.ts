import { describe, expect, it } from "vitest";
import { buildDailyInsight, type DailyInsightLever } from "../../screens/app/dailyInsight";

const levers = (protein: number, training: number, pace: number): DailyInsightLever[] => [
  { key: "protein", label: "Protein", score: protein },
  { key: "training", label: "Training", score: training },
  { key: "pace", label: "Pace", score: pace },
];

const base = {
  verdictStatus: "on_track" as const,
  retentionDelta: 2,
  levers: levers(85, 80, 90),
  weeklyDeltaLb: -1.0,
  shotContext: false,
};

describe("buildDailyInsight", () => {
  it("leads with shot-day guidance when in the ease-in window", () => {
    const i = buildDailyInsight({ ...base, shotContext: true });
    expect(i.tag).toBe("SHOT-DAY READ");
    expect(i.chatPrompt).toMatch(/shot day/i);
  });

  it("flags a fast loss pace (in lb) ahead of the lever read", () => {
    const i = buildDailyInsight({ ...base, weeklyDeltaLb: -2.1, levers: levers(40, 40, 40) });
    expect(i.tone).toBe("watch");
    expect(i.headline).toContain("2.1 lb");
  });

  it("calls out training when it is the weakest lever", () => {
    const i = buildDailyInsight({ ...base, levers: levers(85, 45, 80), retentionDelta: -2, verdictStatus: "drifting" });
    expect(i.headline).toMatch(/training/i);
    expect(i.chatPrompt).toMatch(/strength/i);
  });

  it("calls out protein when it is the weakest lever", () => {
    const i = buildDailyInsight({ ...base, levers: levers(40, 80, 80), verdictStatus: "drifting" });
    expect(i.headline).toMatch(/protein/i);
  });

  it("celebrates a strong, stable week", () => {
    const i = buildDailyInsight(base);
    expect(i.tone).toBe("win");
    expect(i.headline).toMatch(/sweet spot/i);
  });

  it("steadies the trend when drifting with no single lever gap", () => {
    const i = buildDailyInsight({ ...base, verdictStatus: "drifting", retentionDelta: -8 });
    expect(i.tone).toBe("watch");
    expect(i.headline).toMatch(/steady/i);
  });

  it("falls back to a welcoming read with no data", () => {
    const i = buildDailyInsight({
      verdictStatus: "no_data",
      retentionDelta: null,
      levers: [],
      weeklyDeltaLb: null,
      shotContext: false,
    });
    expect(i.tag).toBe("COACH'S READ");
    expect(i.headline).toMatch(/every day/i);
  });
});
