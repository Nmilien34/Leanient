import { describe, expect, it } from "vitest";
import type { UserProfile, WeightLog } from "@leanient/shared";
import { buildGoalJourney } from "../../screens/app/goalJourney";

const now = new Date("2026-06-19T12:00:00.000Z");

function log(measuredAt: string, value: number): WeightLog {
  return {
    id: measuredAt,
    userId: "u",
    value,
    unit: "lb",
    measuredAt,
    source: "manual",
    createdAt: measuredAt,
    updatedAt: measuredAt,
  } as WeightLog;
}

const profile = (over: Partial<Pick<UserProfile, "goalWeight" | "goalWeightUnit" | "goalPace">> = {}) => ({
  goalWeight: 180,
  goalWeightUnit: "lb" as const,
  goalPace: "steady" as const,
  ...over,
});

describe("buildGoalJourney", () => {
  it("returns null without weigh-ins or profile", () => {
    expect(buildGoalJourney({ weightLogs: [], profile: profile(), now })).toBeNull();
    expect(buildGoalJourney({ weightLogs: [log("2026-06-01", 200)], profile: null, now })).toBeNull();
  });

  it("computes progress and the difference from the all-time start (not array order)", () => {
    const j = buildGoalJourney({
      weightLogs: [log("2026-06-10", 190), log("2026-05-01", 200), log("2026-06-18", 190)],
      profile: profile({ goalWeight: 180 }),
      now,
    })!;
    expect(j.startWeight).toBe(200); // earliest by measuredAt
    expect(j.currentWeight).toBe(190); // latest
    expect(j.changeLb).toBeCloseTo(10);
    expect(j.pct).toBe(50); // 10 of 20 lb
    expect(j.headline).toBe("Down 10.0 lb");
  });

  it("projects an ETA at the chosen pace (steady = 1 lb/wk)", () => {
    // 6 lb to go at 1 lb/wk = 6 weeks from 2026-06-19 → end of July.
    const j = buildGoalJourney({
      weightLogs: [log("2026-05-01", 200), log("2026-06-18", 186)],
      profile: profile({ goalWeight: 180, goalPace: "steady" }),
      now,
    })!;
    expect(j.caption).toMatch(/steady pace, goal by Jul 31/);
  });

  it("marks the goal reached", () => {
    const j = buildGoalJourney({
      weightLogs: [log("2026-05-01", 200), log("2026-06-18", 178)],
      profile: profile({ goalWeight: 180 }),
      now,
    })!;
    expect(j.reached).toBe(true);
    expect(j.progress).toBe(1);
    expect(j.headline).toMatch(/at your goal/i);
  });

  it("reads a gain as up since start", () => {
    const j = buildGoalJourney({
      weightLogs: [log("2026-05-01", 200), log("2026-06-18", 203)],
      profile: profile({ goalWeight: 180 }),
      now,
    })!;
    expect(j.changeLb).toBeCloseTo(-3);
    expect(j.headline).toBe("Up 3.0 lb");
    expect(j.pct).toBe(0);
  });
});
