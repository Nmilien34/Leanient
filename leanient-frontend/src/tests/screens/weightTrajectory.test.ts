import { describe, expect, it } from "vitest";
import { buildWeightTrajectory } from "../../screens/app/weightTrajectory";

const base = { current: 200, unit: "lb", series: [210, 206, 203, 200], weekDelta: -1.0 };

describe("buildWeightTrajectory", () => {
  it("returns null with no weigh-ins", () => {
    expect(buildWeightTrajectory({ ...base, series: [] })).toBeNull();
  });

  it("reads a safe-zone loss as steady", () => {
    const v = buildWeightTrajectory(base)!;
    expect(v.pace).toBe("steady");
    expect(v.paceLabel).toMatch(/safe zone/i);
    expect(v.weekDeltaLabel).toBe("↓ 1.0 lb this week");
    expect(v.windowDelta).toBe(-10);
  });

  it("flags a loss faster than the safe band", () => {
    expect(buildWeightTrajectory({ ...base, weekDelta: -2.5 })!.pace).toBe("fast");
  });

  it("treats a small loss as gentle", () => {
    expect(buildWeightTrajectory({ ...base, weekDelta: -0.3 })!.pace).toBe("gentle");
  });

  it("treats a flat or up week as holding", () => {
    expect(buildWeightTrajectory({ ...base, weekDelta: 0 })!.pace).toBe("holding");
    expect(buildWeightTrajectory({ ...base, weekDelta: 0.4 })!.pace).toBe("holding");
  });

  it("converts the pace band to lb for kg users", () => {
    // 1.0 kg/wk loss is ~2.2 lb/wk — past the safe band, so it should read fast.
    expect(buildWeightTrajectory({ ...base, unit: "kg", weekDelta: -1.0 })!.pace).toBe("fast");
  });

  it("handles a missing weekly weigh-in", () => {
    const v = buildWeightTrajectory({ ...base, weekDelta: null })!;
    expect(v.pace).toBe("unknown");
    expect(v.weekDeltaLabel).toBe("No weigh-in this week");
  });
});
