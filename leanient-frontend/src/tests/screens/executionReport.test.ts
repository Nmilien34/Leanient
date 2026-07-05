import { describe, expect, it } from "vitest";
import { buildExecutionReport, weekDaysElapsed } from "../../screens/app/executionReport";

// Sunday Jul 5 2026 = day 7 of a Monday-start week.
const SUNDAY = new Date(2026, 6, 5, 18, 0, 0);
// Tuesday Jul 7 2026 = day 2.
const TUESDAY = new Date(2026, 6, 7, 15, 0, 0);
const TARGET = 140;

const fullDay = (base: Date, back: number) => ({
  protein: 130,
  recordedAt: new Date(base.getFullYear(), base.getMonth(), base.getDate() - back, 12, 0, 0).toISOString(),
});

describe("weekDaysElapsed", () => {
  it("counts Monday-start days elapsed", () => {
    expect(weekDaysElapsed(TUESDAY)).toBe(2);
    expect(weekDaysElapsed(SUNDAY)).toBe(7);
  });
});

describe("buildExecutionReport", () => {
  it("reports a full week as protein days, sessions, and pace", () => {
    const report = buildExecutionReport({
      weekMeals: [0, 1, 2, 4, 5].map((b) => fullDay(SUNDAY, b)),
      dailyProteinTarget: TARGET,
      sessionsThisWeek: 2,
      weeklyWorkoutTarget: 3,
      weeklyDeltaLb: -1.3,
      now: SUNDAY,
    });
    expect(report.rows.map((r) => r.value)).toEqual(["5/7", "2/3", "1.3 lb"]);
    expect(report.rows[2].tone).toBe("good"); // 1.3 <= lean-safe 1.6
    expect(report.nextWeek).toContain("session");
  });

  it("is forgiving early in the week: denominator is days elapsed", () => {
    const report = buildExecutionReport({
      weekMeals: [fullDay(TUESDAY, 0), fullDay(TUESDAY, 1)],
      dailyProteinTarget: TARGET,
      sessionsThisWeek: 0,
      weeklyWorkoutTarget: 3,
      weeklyDeltaLb: null,
      now: TUESDAY,
    });
    expect(report.rows[0].value).toBe("2/2");
    expect(report.rows[0].tone).toBe("good");
    expect(report.rows.find((r) => r.key === "pace")).toBeUndefined();
  });

  it("celebrates a green week and says hold the pattern", () => {
    const report = buildExecutionReport({
      weekMeals: [0, 1, 2, 3, 4, 5, 6].map((b) => fullDay(SUNDAY, b)),
      dailyProteinTarget: TARGET,
      sessionsThisWeek: 3,
      weeklyWorkoutTarget: 3,
      weeklyDeltaLb: -1.1,
      now: SUNDAY,
    });
    expect(report.rows.every((r) => r.tone === "good")).toBe(true);
    expect(report.summary).toContain("green");
  });

  it("flags a fast pace without shaming", () => {
    const report = buildExecutionReport({
      weekMeals: [0, 1, 2, 3, 4, 5, 6].map((b) => fullDay(SUNDAY, b)),
      dailyProteinTarget: TARGET,
      sessionsThisWeek: 3,
      weeklyWorkoutTarget: 3,
      weeklyDeltaLb: -2.4,
      now: SUNDAY,
    });
    const pace = report.rows.find((r) => r.key === "pace")!;
    expect(pace.tone).toBe("neutral");
    expect(report.nextWeek).toContain("lean-safe");
  });
});
