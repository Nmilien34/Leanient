import { describe, expect, it } from "vitest";
import { buildRollingConsistency, PROTEIN_DAY_RATIO } from "../../screens/app/consistency";

// Fixed "now": Tuesday Jul 7 2026, 3pm local.
const NOW = new Date(2026, 6, 7, 15, 0, 0);
const TARGET = 140;

/** A meal worth one full protein day, `back` days ago at noon local. */
const fullDay = (back: number) => ({
  protein: Math.ceil(TARGET * PROTEIN_DAY_RATIO),
  recordedAt: new Date(2026, 6, 7 - back, 12, 0, 0).toISOString(),
});
const workoutOn = (back: number) => ({
  recordedAt: new Date(2026, 6, 7 - back, 18, 0, 0).toISOString(),
});

describe("buildRollingConsistency", () => {
  it("counts protein days hit across the rolling 7-day window", () => {
    const r = buildRollingConsistency({
      meals: [fullDay(6), fullDay(5), fullDay(3), fullDay(2), fullDay(1)],
      workouts: [],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 3,
      now: NOW,
    });
    expect(r.proteinDaysHit).toBe(5);
    expect(r.proteinDots).toEqual(["hit", "hit", "miss", "hit", "hit", "hit", "open"]);
  });

  it("keeps today forgiving: unfinished today is open, never a miss", () => {
    const r = buildRollingConsistency({
      meals: [{ protein: 40, recordedAt: new Date(2026, 6, 7, 9, 0, 0).toISOString() }],
      workouts: [],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 3,
      now: NOW,
    });
    expect(r.proteinDots[6]).toBe("open");
    expect(r.proteinDaysHit).toBe(0);
  });

  it("counts today once it is actually hit", () => {
    const r = buildRollingConsistency({
      meals: [fullDay(0)],
      workouts: [],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 3,
      now: NOW,
    });
    expect(r.proteinDots[6]).toBe("hit");
    expect(r.proteinDaysHit).toBe(1);
  });

  it("sums multiple meals within a day toward the day's target", () => {
    const r = buildRollingConsistency({
      meals: [
        { protein: 70, recordedAt: new Date(2026, 6, 6, 8, 0, 0).toISOString() },
        { protein: 60, recordedAt: new Date(2026, 6, 6, 19, 0, 0).toISOString() },
      ],
      workouts: [],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 3,
      now: NOW,
    });
    expect(r.proteinDaysHit).toBe(1); // 130 >= 126 (90% of 140)
  });

  it("ignores logs older than the window and counts session days once each", () => {
    const r = buildRollingConsistency({
      meals: [fullDay(7), fullDay(9)],
      workouts: [workoutOn(1), workoutOn(1), workoutOn(4), workoutOn(10)],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 3,
      now: NOW,
    });
    expect(r.proteinDaysHit).toBe(0);
    expect(r.sessionDays).toBe(2);
    expect(r.sessionTarget).toBe(3);
  });

  it("labels the strip oldest to today", () => {
    const r = buildRollingConsistency({
      meals: [],
      workouts: [],
      dailyProteinTarget: TARGET,
      weeklyWorkoutTarget: 2,
      now: NOW, // Tuesday
    });
    expect(r.dayLabels).toEqual(["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Today"]);
  });
});
