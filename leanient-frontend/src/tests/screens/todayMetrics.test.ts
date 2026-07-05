import { describe, expect, it } from "vitest";
import type { Weekday } from "@leanient/shared";
import { deriveTodayView, restCueForEnergy } from "../../screens/app/todayMetrics";
import { mockProfile, mockMedicationProtocol } from "../../mocks/home";
import { mockTodayLog } from "../../mocks/todayLog";

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** A shot day that lands exactly `n` days before `now`, regardless of weekday. */
function shotDayNDaysAgo(now: Date, n: number): Weekday {
  return WEEKDAYS[(now.getDay() - n + 7) % 7];
}

describe("deriveTodayView", () => {
  it("reproduces the shot-cycle hero from medication data (2 days post-shot)", () => {
    const now = new Date(2026, 5, 2); // local midnight, Jun 2 2026
    const medication = {
      ...mockMedicationProtocol,
      medicationName: "Wegovy",
      shotDays: [shotDayNDaysAgo(now, 2)],
      startDate: "2026-04-19", // 44 days before now
    };

    const today = deriveTodayView({
      profile: mockProfile,
      medication,
      recommendedWorkouts: [],
      dailyLog: mockTodayLog,
      now,
    });

    expect(today.hero.pill).toBe("SHOT +2 · GOOD ENERGY");
    expect(today.hero.headline).toBe("You can push today.");
    expect(today.hero.tone).toBe("on_track");
    expect(today.hero.actionLabel).toBe("See today's plan");
    expect(today.contextLabel).toBe("Tuesday, Jun 2 · Day 44 on Wegovy");
    expect(today.nextShot).toEqual({ label: "in 5 days", onProtocol: true, dose: "1 mg" });
  });

  it("derives daily protein from the day's meals and the profile target", () => {
    const now = new Date(2026, 5, 2);
    const today = deriveTodayView({
      profile: mockProfile, // dailyProteinTarget 120
      medication: mockMedicationProtocol,
      recommendedWorkouts: [],
      dailyLog: mockTodayLog, // 32 + 26 = 58g
      now,
    });

    expect(today.protein.logged).toBe(58);
    expect(today.protein.target).toBe(120);
    expect(today.protein.ratio).toBeCloseTo(58 / 120, 5);
    expect(today.loggedMeals).toHaveLength(2);
  });

  it("sets a session goal of one for anyone who trains, even with no recommendation loaded", () => {
    const now = new Date(2026, 5, 2);
    const today = deriveTodayView({
      profile: mockProfile, // weeklyWorkoutTarget 3
      medication: mockMedicationProtocol,
      recommendedWorkouts: [],
      dailyLog: { meals: [], workoutsDone: 0 },
      now,
    });

    expect(today.session).toEqual({ done: 0, target: 1, ratio: 0 });
    expect(today.protein.logged).toBe(0);
  });

  it("falls back to a neutral hero when the user is not on a protocol", () => {
    const now = new Date(2026, 5, 2);
    const today = deriveTodayView({
      profile: mockProfile,
      medication: undefined,
      recommendedWorkouts: [],
      dailyLog: mockTodayLog,
      now,
    });

    expect(today.hero.pill).toBe("TODAY");
    expect(today.nextShot.onProtocol).toBe(false);
    expect(today.contextLabel).toBe("Tuesday, Jun 2");
  });

  it("flags the day after a shot as a low-energy, calm-tone day", () => {
    const now = new Date(2026, 5, 2);
    const today = deriveTodayView({
      profile: mockProfile,
      medication: { ...mockMedicationProtocol, shotDays: [shotDayNDaysAgo(now, 1)] },
      recommendedWorkouts: [],
      dailyLog: mockTodayLog,
      now,
    });

    expect(today.hero.pill).toBe("SHOT +1 · LOW ENERGY");
    expect(today.hero.tone).toBe("drifting");
  });
});

describe("restCueForEnergy", () => {
  it("gives a shot-aware rest cue per energy window", () => {
    expect(restCueForEnergy("good")).toBe("Post-shot energy is good today, so you've got the next set.");
    expect(restCueForEnergy("mid")).toContain("Hydrate");
    expect(restCueForEnergy("low")).toContain("Take your time");
  });

  it("falls back to a neutral cue off-protocol", () => {
    expect(restCueForEnergy(null)).toBe("Breathe and shake out the arms. You've got the next set.");
  });
});
