import { describe, expect, it } from "vitest";
import { deriveWeekPlan } from "../../screens/app/weekPlanMetrics";
import { mockVerdictOnTrack } from "../../mocks/verdicts";
import { mockProfile, mockMedicationProtocol, mockWeightLogs } from "../../mocks/home";
import { mockWorkouts } from "../../mocks/workouts";

const now = new Date(2026, 5, 3); // Jun 3 2026

function plan() {
  return deriveWeekPlan({
    profile: mockProfile,
    verdict: mockVerdictOnTrack,
    medication: mockMedicationProtocol,
    weightLogs: mockWeightLogs,
    sessions: mockWorkouts,
    now,
  });
}

describe("deriveWeekPlan", () => {
  it("scales the daily protein target to the week from verdict inputs", () => {
    const p = plan().protein;
    // 58.9 g/day × 7 ≈ 412 logged, against 120 × 7 = 840 target → 49%.
    expect(p.dailyTarget).toBe(120);
    expect(p.target).toBe(840);
    expect(p.logged).toBe(412);
    expect(p.pct).toBe(49);
    expect(p.subline).toContain("49%");
  });

  it("lays completed sessions over the weekly plan", () => {
    const t = plan().training;
    expect(t.done).toBe(2);
    expect(t.target).toBe(3);
    expect(t.sessions).toHaveLength(3);
    expect(t.sessions.map((s) => s.status)).toEqual(["done", "done", "today"]);
    expect(t.sessions[0].statusLabel).toBe("Done");
    // The "today" session shows its duration; earlier ones don't.
    expect(t.sessions[2].detail).toBe(`${mockWorkouts[2].durationMinutes} min`);
    expect(t.sessions[0].detail).toBe("");
  });

  it("derives the pace ETA from goal pace and remaining weight", () => {
    const p = plan().pace;
    expect(p.lbPerWeek).toBe(1.0); // steady
    expect(p.remaining).toBe(12); // 184 current − 172 goal
    expect(p.goalWeight).toBe(172);
    expect(p.statusLabel).toBe("On track"); // last weekly loss 2.0 lb, within band
    expect(p.etaLabel).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    expect(p.headline).toBe("12 lb to your goal");
  });

  it("labels the week range and shot day from contract data", () => {
    const wp = plan();
    expect(wp.weekRangeLabel).toBe("Week of May 25 – May 31");
    expect(wp.shotDayName).toBe("Saturday");
  });

  it("omits the shot day when the user is not on a protocol", () => {
    const wp = deriveWeekPlan({
      profile: mockProfile,
      verdict: mockVerdictOnTrack,
      medication: undefined,
      weightLogs: mockWeightLogs,
      sessions: mockWorkouts,
      now,
    });
    expect(wp.shotDayName).toBeNull();
  });
});
