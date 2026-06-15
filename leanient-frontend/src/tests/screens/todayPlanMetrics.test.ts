import { describe, expect, it } from "vitest";
import type { Weekday } from "@leanient/shared";
import { deriveTodayPlan } from "../../screens/app/todayPlanMetrics";
import { mockProfile, mockMedicationProtocol } from "../../mocks/home";
import { mockTodayLog } from "../../mocks/todayLog";
import { mockRecommendedWorkout } from "../../mocks/workouts";

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const shotDayNDaysAgo = (now: Date, n: number): Weekday => WEEKDAYS[(now.getDay() - n + 7) % 7];

const now = new Date(2026, 5, 2); // Tuesday, Jun 2 2026

function plan(overrides = {}) {
  return deriveTodayPlan({
    profile: mockProfile,
    medication: { ...mockMedicationProtocol, shotDays: [shotDayNDaysAgo(now, 2)], startDate: "2026-04-19" },
    recommendedWorkout: mockRecommendedWorkout,
    dailyLog: mockTodayLog,
    now,
    ...overrides,
  });
}

describe("deriveTodayPlan", () => {
  it("builds the shot-aware subtitle from date + cycle", () => {
    expect(plan().subtitle).toBe("Tuesday · Day 44 · 2 days after your shot");
  });

  it("derives the EAT pillar from today's meals and the daily target", () => {
    const eat = plan().eat;
    expect(eat.logged).toBe(58); // 32 + 26
    expect(eat.target).toBe(120);
    expect(eat.remaining).toBe(62);
    expect(eat.pct).toBe(48);
    expect(eat.subline).toBe("Two more protein-forward meals. Appetite's easiest today.");
  });

  it("suggests three protein-forward meals while protein is still owed", () => {
    const eat = plan().eat; // good appetite (2 days after shot) → bigger protein hits first
    expect(eat.suggestions).toHaveLength(3);
    expect(eat.suggestions[0].name).toBe("Grilled chicken bowl");
    expect(eat.suggestions[0].protein).toBe(40);
    expect(eat.suggestions[0].calories).toBe(450);
    // Ranked by protein for a good appetite window.
    expect(eat.suggestions.map((s) => s.protein)).toEqual([40, 35, 30]);
  });

  it("drops suggestions once the protein goal is met", () => {
    const p = plan({ dailyLog: { ...mockTodayLog, meals: [{ id: "x", label: "Big", grams: 130, loggedAt: "2026-06-02T08:00:00Z" }] } });
    expect(p.eat.remaining).toBe(0);
    expect(p.eat.suggestions).toEqual([]);
  });

  it("builds the MOVE pillar from the recommended workout", () => {
    const move = plan().move;
    expect(move).not.toBeNull();
    expect(move?.title).toBe("Upper body · dumbbells");
    expect(move?.duration).toBe("22 min");
    expect(move?.tags).toEqual(["Chest", "Back", "Arms"]);
    expect(move?.subline).toBe(mockRecommendedWorkout.shortDescription);
  });

  it("derives the STEADY pillar from the shot cycle, naming the next shot day", () => {
    const steady = plan().steady;
    expect(steady?.shotLabel).toBe("Shot +2");
    expect(steady?.title).toBe("Front-load protein and water");
    expect(steady?.subline).toContain("Next shot Sunday.");
  });

  it("hides the MOVE and STEADY pillars without a workout or protocol", () => {
    const p = deriveTodayPlan({
      profile: mockProfile,
      medication: undefined,
      recommendedWorkout: undefined,
      dailyLog: mockTodayLog,
      now,
    });
    expect(p.move).toBeNull();
    expect(p.steady).toBeNull();
    expect(p.subtitle).toBe("Tuesday");
  });
});
