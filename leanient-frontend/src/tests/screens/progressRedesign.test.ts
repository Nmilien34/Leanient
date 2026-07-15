import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot, WeightLog } from "@leanient/shared";
import {
  buildConsistencyHeat,
  buildGoalPath,
  buildLockedReads,
  buildMuscleTrend,
  buildPhotoSpread,
  buildProgressCoachLine,
  buildProgressHeader,
  buildWeightTrend,
} from "../../screens/app/progressRedesign";

const NOW = new Date("2026-07-14T10:00:00");

const weighIn = (daysAgo: number, value: number): WeightLog =>
  ({
    id: `w${daysAgo}`,
    userId: "u1",
    value,
    unit: "lb",
    measuredAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  }) as WeightLog;

const snapshot = (weekOf: string, score: number): MuscleRetentionSnapshot =>
  ({ weekOf, muscleRetentionScore: score, retentionLabel: "keeping_muscle" }) as MuscleRetentionSnapshot;

describe("buildProgressHeader", () => {
  it("greets with weeks of showing up once established", () => {
    const view = buildProgressHeader({ weightLogs: [weighIn(42, 226), weighIn(0, 212)], weeksOnMed: 6, now: NOW });
    expect(view.title).toBe("6 weeks of showing up.");
    expect(view.sub).toBe("Everything here is built from what you logged.");
  });

  it("uses the early frame in the first days", () => {
    const view = buildProgressHeader({ weightLogs: [weighIn(3, 226), weighIn(0, 224)], weeksOnMed: 1, now: NOW });
    expect(view.title).toBe("Day 4. The picture builds fast.");
    expect(view.sub).toContain("2 weigh-ins in");
  });

  it("has a starting frame with no logs at all", () => {
    const view = buildProgressHeader({ weightLogs: [], weeksOnMed: null, now: NOW });
    expect(view.title).toBe("Your picture starts here.");
  });
});

describe("buildWeightTrend", () => {
  const sixWeeks = [
    weighIn(42, 226),
    weighIn(38, 225),
    weighIn(30, 222),
    weighIn(24, 220),
    weighIn(16, 217),
    weighIn(9, 214),
    weighIn(2, 212),
  ];

  it("smooths to weekly buckets with raw logs as noise", () => {
    const view = buildWeightTrend({ weightLogs: sixWeeks, goalWeight: 185, now: NOW });
    expect(view).not.toBeNull();
    expect(view!.early).toBe(false);
    expect(view!.noise).toHaveLength(7);
    expect(view!.trend.length).toBeGreaterThanOrEqual(3);
    expect(view!.trend.length).toBeLessThan(7);
    expect(view!.deltaLabel).toBe("↓ 14 lb");
    expect(view!.startLabel).toBe("226");
    expect(view!.nowLabel).toBe("212 now");
    expect(view!.axis[2]).toBe("TODAY");
    // Trend descends: later y (screen-down) is larger for weight loss.
    expect(view!.trend[view!.trend.length - 1].y).toBeGreaterThan(view!.trend[0].y);
  });

  it("switches to early mode with a projection under three weeks", () => {
    const view = buildWeightTrend({ weightLogs: [weighIn(3, 226), weighIn(0, 224)], goalWeight: 185, now: NOW });
    expect(view!.early).toBe(true);
    expect(view!.projection).not.toBeNull();
    expect(view!.projection![1].x).toBe(1);
    expect(view!.axis).toEqual(["DAY 1", "TODAY", "GOAL"]);
    expect(view!.note).toContain("direction");
    // The real points stay compressed to the left so the projection has room.
    expect(view!.trend[view!.trend.length - 1].x).toBeLessThanOrEqual(0.3);
  });

  it("returns null with no logs", () => {
    expect(buildWeightTrend({ weightLogs: [], goalWeight: 185, now: NOW })).toBeNull();
  });
});

describe("buildGoalPath", () => {
  const profile = { goalWeight: 185, goalWeightUnit: "lb", goalPace: "steady" } as never;
  const logs = [weighIn(42, 226), weighIn(28, 220), weighIn(14, 216), weighIn(2, 212)];

  it("reads ahead when the real pace beats the plan", () => {
    // 14 lb in 6 weeks ≈ 2.3 lb/wk vs the 1 lb/wk steady plan.
    const view = buildGoalPath({ weightLogs: logs, profile, now: NOW });
    expect(view).not.toBeNull();
    expect(view!.status).toBe("ahead");
    expect(view!.headline).toMatch(/\d+ (days|weeks) ahead/);
    expect(view!.goalLabel).toBe("185 LB");
    expect(view!.chips[0].em).toBe(true);
    expect(view!.chips[0].text).toContain("your pace ·");
    expect(view!.chips[1].text).toContain("plan ·");
    expect(view!.chips[2].text).toBe("set at onboarding");
    // Plan line spans start (top) to goal (bottom).
    expect(view!.plan[0]).toEqual({ x: 0, y: 0 });
    expect(view!.plan[1].y).toBe(1);
    expect(view!.yourPath![1].y).toBe(1);
  });

  it("reads a modest lead in days and a big one in weeks", () => {
    // ~1.02 lb/wk vs the 1.0 plan: a few days ahead.
    const modest = [weighIn(42, 226), weighIn(28, 224), weighIn(14, 222.2), weighIn(2, 219.9)];
    const view = buildGoalPath({ weightLogs: modest, profile, now: NOW });
    expect(view!.headline).toMatch(/^\d+ days ahead$/);

    const fast = buildGoalPath({ weightLogs: logs, profile, now: NOW });
    expect(fast!.headline).toMatch(/^\d+ weeks ahead$/);
  });

  it("stays neutral when the trend is not moving yet", () => {
    const flat = [weighIn(28, 226), weighIn(14, 226.4), weighIn(2, 226.2)];
    const view = buildGoalPath({ weightLogs: flat, profile, now: NOW });
    expect(view!.status).toBe("building");
    expect(view!.yourPath).toBeNull();
    expect(view!.headline).toBe("trend settling");
  });

  it("needs three weigh-ins and a goal below start", () => {
    expect(buildGoalPath({ weightLogs: logs.slice(0, 2), profile, now: NOW })).toBeNull();
    expect(buildGoalPath({ weightLogs: logs, profile: null, now: NOW })).toBeNull();
    expect(
      buildGoalPath({ weightLogs: logs, profile: { goalWeight: 240, goalWeightUnit: "lb", goalPace: "steady" } as never, now: NOW }),
    ).toBeNull();
  });
});

describe("buildProgressCoachLine", () => {
  const header = { title: "", sub: "" };

  it("keeps the rhythm when ahead", () => {
    const logs = [weighIn(42, 226), weighIn(28, 220), weighIn(14, 216), weighIn(2, 212)];
    const goalPath = buildGoalPath({ weightLogs: logs, profile: { goalWeight: 185, goalWeightUnit: "lb", goalPace: "steady" } as never, now: NOW });
    expect(buildProgressCoachLine({ goalPath, header, weightLogs: logs, now: NOW })).toBe(
      "Ahead of your own plan. Keep the rhythm.",
    );
  });

  it("celebrates early movement before the goal path unlocks", () => {
    const logs = [weighIn(3, 226), weighIn(0, 224)];
    expect(buildProgressCoachLine({ goalPath: null, header, weightLogs: logs, now: NOW })).toBe(
      "4 days in and already moving. I'm here all week.",
    );
  });

  it("asks for the first weigh-in when there are none", () => {
    expect(buildProgressCoachLine({ goalPath: null, header, weightLogs: [], now: NOW })).toContain("first weigh-in");
  });
});

describe("buildConsistencyHeat", () => {
  const iso = (daysAgo: number, hour = 12) => {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  it("levels days by how much got logged and counts active days", () => {
    const view = buildConsistencyHeat({
      meals: [{ recordedAt: iso(1, 8) }, { recordedAt: iso(1, 13) }, { recordedAt: iso(2) }],
      workouts: [{ recordedAt: iso(3) }],
      weightLogs: [],
      doseLogs: [],
      snapshots: [],
      now: NOW,
    });
    expect(view.cells).toHaveLength(30);
    expect(view.cells[29].today).toBe(true);
    expect(view.cells[28].level).toBe(2); // two meals yesterday
    expect(view.cells[27].level).toBe(1); // one meal
    expect(view.cells[26].level).toBe(1); // one workout
    expect(view.activeLabel).toBe("3 of 30");
    expect(view.chips.map((c) => c.text)).toContain("3 meals");
    expect(view.chips.map((c) => c.text)).toContain("1 session");
    expect(view.chips[view.chips.length - 1].text).toBe("every log sharpens your reads");
  });

  it("counts check-ins from snapshot weeks inside the window", () => {
    const weekOf = new Date(NOW.getTime() - 5 * 86_400_000).toISOString().slice(0, 10);
    const view = buildConsistencyHeat({
      meals: [],
      workouts: [],
      weightLogs: [],
      doseLogs: [],
      snapshots: [{ weekOf }],
      now: NOW,
    });
    expect(view.chips.map((c) => c.text)).toContain("1 check-in");
  });
});

describe("buildLockedReads", () => {
  it("names the weigh-ins that unlock the goal path", () => {
    const reads = buildLockedReads({ weighInCount: 2, hasGoal: true, snapshotCount: 3 });
    expect(reads).toHaveLength(1);
    expect(reads[0].key).toBe("goal_path");
    expect(reads[0].sub).toBe("One more weigh-in unlocks your plan line.");
    expect(reads[0].dots).toEqual({ filled: 2, total: 3 });
  });

  it("points the muscle read at the first check-in", () => {
    const reads = buildLockedReads({ weighInCount: 5, hasGoal: true, snapshotCount: 0 });
    expect(reads).toHaveLength(1);
    expect(reads[0].key).toBe("muscle_trend");
    expect(reads[0].sub).toContain("Sunday check-in");
  });

  it("goes quiet once everything is unlocked", () => {
    expect(buildLockedReads({ weighInCount: 5, hasGoal: true, snapshotCount: 2 })).toHaveLength(0);
  });
});

describe("buildMuscleTrend", () => {
  it("reads the score delta since the first visible week", () => {
    const view = buildMuscleTrend(
      [snapshot("2026-06-07", 78), snapshot("2026-06-14", 80), snapshot("2026-07-12", 84)],
      0,
    );
    expect(view!.deltaLabel).toBe("↑ 6");
    expect(view!.deltaSuffix).toBe("since week 1");
    expect(view!.axis).toEqual(["WEEK 1", "WEEK 3"]);
    // Rising score climbs the chart (smaller y later).
    expect(view!.points[2].y).toBeLessThan(view!.points[0].y);
  });

  it("offsets week numbers when a window hides earlier weeks", () => {
    const view = buildMuscleTrend([snapshot("2026-07-05", 82), snapshot("2026-07-12", 84)], 4);
    expect(view!.axis).toEqual(["WEEK 5", "WEEK 6"]);
  });

  it("returns null with no snapshots", () => {
    expect(buildMuscleTrend([], 0)).toBeNull();
  });
});

describe("buildPhotoSpread", () => {
  const photo = (id: string, captureDate: string, kind = "body") => ({ id, captureDate, kind, viewUrl: `u/${id}` });

  it("spreads first, middle, latest and labels by week", () => {
    const photos = [
      photo("a", "2026-06-01"),
      photo("b", "2026-06-15"),
      photo("c", "2026-06-22"),
      photo("d", "2026-07-06"),
      photo("e", "2026-07-13"),
    ];
    const spread = buildPhotoSpread(photos, (d) => (d === "2026-06-01" ? 1 : d === "2026-06-22" ? 4 : 6));
    expect(spread.map((p) => p.id)).toEqual(["a", "c", "e"]);
    expect(spread.map((p) => p.label)).toEqual(["WK 1", "WK 4", "WK 6"]);
  });

  it("ignores face photos and handles empty", () => {
    expect(buildPhotoSpread([photo("f", "2026-07-01", "face")], () => 1)).toHaveLength(0);
    expect(buildPhotoSpread([], () => 1)).toHaveLength(0);
  });
});
