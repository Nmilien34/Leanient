import { describe, expect, it } from "vitest";
import { resolveHomeLayout, daysSinceLatest } from "../../screens/app/homeLayout";

const base = { hasScore: true, retentionDelta: -3, daysSinceLastActivity: 0, shotContext: false };

describe("resolveHomeLayout", () => {
  it("returns null for a user with no score (cold-start handles them)", () => {
    expect(resolveHomeLayout({ ...base, hasScore: false })).toBeNull();
  });

  it("steady default leads with the score, then the plan (verdict lives behind the gauge)", () => {
    const l = resolveHomeLayout(base)!;
    expect(l.state).toBe("steady");
    expect(l.order).toEqual(["score", "plan"]);
    expect(l.banner).toBeNull();
  });

  it("thriving (stable/improving) leads with the score", () => {
    expect(resolveHomeLayout({ ...base, retentionDelta: 4 })!.state).toBe("thriving");
    expect(resolveHomeLayout({ ...base, retentionDelta: 4 })!.order).toEqual(["score", "plan"]);
  });

  it("an unexplained steep drop is still classified drifting, gauge leads", () => {
    const l = resolveHomeLayout({ ...base, retentionDelta: -22 })!;
    expect(l.state).toBe("drifting");
    expect(l.order).toEqual(["score", "plan"]);
  });

  it("shot-day ABSORBS the dip — same steep drop reads as guidance, not drift", () => {
    // The C-vs-E case: 65/100 down 35 on a shot day should NOT alarm.
    const l = resolveHomeLayout({ ...base, retentionDelta: -35, shotContext: true })!;
    expect(l.state).toBe("shot_day");
    expect(l.order).toEqual(["score", "plan"]);
  });

  it("lapsed adds the re-engage banner above the gauge", () => {
    const l = resolveHomeLayout({ hasScore: true, retentionDelta: -35, daysSinceLastActivity: 10, shotContext: true })!;
    expect(l.state).toBe("lapsed");
    expect(l.order).toEqual(["score", "plan"]);
    expect(l.banner?.tone).toBe("reengage");
    expect(l.banner?.message).toContain("10 days");
  });

  it("just-under the lapse threshold is not lapsed", () => {
    expect(resolveHomeLayout({ ...base, daysSinceLastActivity: 4 })!.state).not.toBe("lapsed");
  });
});

describe("daysSinceLatest", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0);
  it("returns whole days since the most recent timestamp", () => {
    expect(daysSinceLatest(["2026-06-10T12:00:00", "2026-06-13T12:00:00"], now)).toBe(2);
  });
  it("ignores empty/invalid entries and returns null when none valid", () => {
    expect(daysSinceLatest([null, undefined, ""], now)).toBeNull();
    expect(daysSinceLatest([null, "2026-06-14T12:00:00"], now)).toBe(1);
  });
});
