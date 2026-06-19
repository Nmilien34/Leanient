import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@leanient/shared";
import { buildStrengthTrend, sessionVolume } from "../../screens/app/strengthTrend";

const DAY = 86_400_000;

function log(daysAgo: number, now: Date, opts: { weight: number | null; reps: number; resistance?: boolean }): WorkoutLog {
  return {
    id: `w-${daysAgo}`,
    userId: "u",
    recordedAt: new Date(now.getTime() - daysAgo * DAY).toISOString(),
    workoutId: null,
    customWorkoutName: "Lift",
    exercises: [{ name: "Squat", sets: [{ reps: opts.reps, weight: opts.weight }] }],
    durationMinutes: 30,
    countsAsResistance: opts.resistance ?? true,
    notes: null,
    createdAt: "",
    updatedAt: "",
  } as unknown as WorkoutLog;
}

const now = new Date("2026-06-19T12:00:00.000Z");

describe("sessionVolume", () => {
  it("sums weight x reps across sets", () => {
    expect(sessionVolume(log(0, now, { weight: 100, reps: 5 }))).toBe(500);
  });
  it("treats bodyweight sets as zero volume", () => {
    expect(sessionVolume(log(0, now, { weight: null, reps: 10 }))).toBe(0);
  });
});

describe("buildStrengthTrend", () => {
  it("returns null with no resistance sessions", () => {
    expect(buildStrengthTrend([log(1, now, { weight: 100, reps: 5, resistance: false })], now)).toBeNull();
  });

  it("ignores sessions older than the 6-week window", () => {
    expect(buildStrengthTrend([log(20, now, { weight: 100, reps: 5 })], now)).not.toBeNull();
    expect(buildStrengthTrend([log(60, now, { weight: 100, reps: 5 })], now)).toBeNull();
  });

  it("reads climbing when recent volume outpaces earlier weeks", () => {
    const logs = [
      log(35, now, { weight: 100, reps: 5 }),
      log(28, now, { weight: 100, reps: 5 }),
      log(5, now, { weight: 200, reps: 5 }),
      log(2, now, { weight: 200, reps: 5 }),
    ];
    const v = buildStrengthTrend(logs, now)!;
    expect(v.trend).toBe("climbing");
    expect(v.hasLoad).toBe(true);
    expect(v.headline).toMatch(/climbing/i);
  });

  it("reads lighter when recent volume drops off", () => {
    const logs = [
      log(35, now, { weight: 200, reps: 5 }),
      log(28, now, { weight: 200, reps: 5 }),
      log(5, now, { weight: 80, reps: 5 }),
      log(2, now, { weight: 80, reps: 5 }),
    ];
    expect(buildStrengthTrend(logs, now)!.trend).toBe("lighter");
  });

  it("flags bodyweight-only logging and nudges to add load", () => {
    const logs = [
      log(20, now, { weight: null, reps: 10 }),
      log(13, now, { weight: null, reps: 10 }),
      log(6, now, { weight: null, reps: 10 }),
    ];
    const v = buildStrengthTrend(logs, now)!;
    expect(v.hasLoad).toBe(false);
    expect(v.subline).toMatch(/add the weight/i);
  });

  it("counts this week's sessions", () => {
    const v = buildStrengthTrend([log(1, now, { weight: 100, reps: 5 }), log(3, now, { weight: 100, reps: 5 })], now)!;
    expect(v.sessionsThisWeek).toBe(2);
  });
});
