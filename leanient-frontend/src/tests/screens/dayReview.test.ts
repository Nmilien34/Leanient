import { describe, expect, it } from "vitest";
import { buildDayReviews, estimateSessionBurn, MIN_STARTED_SECONDS } from "../../screens/app/dayReview";
import type { SessionStartMap } from "../../screens/app/sessionStarts";

const NOW = new Date(2026, 6, 7, 15, 0, 0); // Tuesday Jul 7
const TARGET = 140;

const meal = (back: number, protein: number, calories: number) => ({
  protein,
  calories,
  recordedAt: new Date(2026, 6, 7 - back, 12, 0, 0).toISOString(),
});
const workout = (back: number, minutes: number) => ({
  recordedAt: new Date(2026, 6, 7 - back, 18, 0, 0).toISOString(),
  durationMinutes: minutes,
  customWorkoutName: "Upper body",
});
const startOn = (back: number, seconds: number, completed = false): SessionStartMap => {
  const d = new Date(2026, 6, 7 - back);
  const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  return { [key]: { dateKey: key, workoutTitle: "Upper body", startedAt: "", elapsedSeconds: seconds, completed } };
};

function build(overrides: Partial<Parameters<typeof buildDayReviews>[0]> = {}) {
  return buildDayReviews({
    meals: [],
    workouts: [],
    sessionStarts: {},
    dailyProteinTarget: TARGET,
    dailyCalorieTarget: 1900,
    weightLb: 200,
    now: NOW,
    ...overrides,
  });
}

describe("estimateSessionBurn", () => {
  it("uses MET math on body weight, rounded to 5", () => {
    // 5.0 MET × 3.5 × 90.7kg / 200 = 7.94 kcal/min → 22 min ≈ 175
    expect(estimateSessionBurn(22, 200)).toBe(175);
    expect(estimateSessionBurn(22, null)).toBeNull();
    expect(estimateSessionBurn(0, 200)).toBeNull();
  });
});

describe("buildDayReviews", () => {
  it("returns the window newest first with Today labeled", () => {
    const reviews = build();
    expect(reviews).toHaveLength(7);
    expect(reviews[0].dayLabel).toBe("Today");
    expect(reviews[1].dayLabel).toBe("Mon, Jul 6");
  });

  it("buckets protein and calories per day and marks hits", () => {
    const reviews = build({ meals: [meal(1, 70, 500), meal(1, 60, 450), meal(2, 20, 200)] });
    const mon = reviews[1];
    expect(mon.proteinG).toBe(130);
    expect(mon.intakeCal).toBe(950);
    expect(mon.proteinHit).toBe(true); // 130 >= 126
    expect(reviews[2].proteinHit).toBe(false);
  });

  it("reads a logged workout as done with an estimated burn", () => {
    const reviews = build({ meals: [meal(1, 130, 900)], workouts: [workout(1, 22)] });
    const mon = reviews[1];
    expect(mon.session).toEqual({ state: "done", minutes: 22, title: "Upper body" });
    expect(mon.burnedCal).toBe(175);
    expect(mon.summary).toBe("Protein hit · 22-min session");
    expect(mon.muscleRead).toContain("Full muscle signal");
  });

  it("names a started-but-unfinished session honestly", () => {
    const reviews = build({ meals: [meal(1, 10, 120)], sessionStarts: startOn(1, 480) });
    const mon = reviews[1];
    expect(mon.session.state).toBe("started");
    expect(mon.session.minutes).toBe(8);
    expect(mon.summary).toBe("10g protein · session started, unfinished");
    expect(mon.muscleRead).toContain("started the session (8 min)");
    expect(mon.muscleRead).toContain("logged 10g");
  });

  it("a logged workout outranks a start, and tap-length starts don't count", () => {
    const both = build({ workouts: [workout(1, 30)], sessionStarts: startOn(1, 480) });
    expect(both[1].session.state).toBe("done");

    const tap = build({ sessionStarts: startOn(1, MIN_STARTED_SECONDS - 1) });
    expect(tap[1].session.state).toBe("none");
    expect(tap[1].summary).toBe("Nothing logged");
  });
});
