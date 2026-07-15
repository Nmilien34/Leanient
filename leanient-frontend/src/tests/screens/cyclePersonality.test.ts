import { describe, expect, it } from "vitest";
import {
  buildCycleRibbon,
  deriveCyclePersonality,
  derivePersonalPattern,
  greetingForHour,
  morningPill,
  proteinLoggedYesterday,
} from "../../screens/app/cyclePersonality";
import type { ShotCycle } from "../../screens/app/todayMetrics";

// Weekly single-shot semantics: the next shot lands 7 - d days out.
const cycleAt = (daysSinceShot: number, daysUntilNext = daysSinceShot === 0 ? 7 : 7 - daysSinceShot): ShotCycle =>
  ({ daysSinceShot, daysUntilNext, dayOnMed: 46, nextShotDayName: "Saturday", phase: { energy: "mid" } }) as ShotCycle;

describe("deriveCyclePersonality", () => {
  it("maps each cycle day to its personality", () => {
    expect(deriveCyclePersonality(cycleAt(0)).kind).toBe("reset");
    expect(deriveCyclePersonality(cycleAt(1)).kind).toBe("settling");
    expect(deriveCyclePersonality(cycleAt(2)).kind).toBe("greenlight");
    expect(deriveCyclePersonality(cycleAt(3)).kind).toBe("greenlight");
    expect(deriveCyclePersonality(cycleAt(4)).kind).toBe("steady");
    expect(deriveCyclePersonality(cycleAt(5)).kind).toBe("defense");
    expect(deriveCyclePersonality(cycleAt(6)).kind).toBe("defense");
  });

  it("marks only defense days amber and names the shot position in the pill", () => {
    expect(deriveCyclePersonality(cycleAt(5)).amber).toBe(true);
    expect(deriveCyclePersonality(cycleAt(5)).pill).toContain("SHOT +5");
    expect(deriveCyclePersonality(cycleAt(0)).amber).toBe(false);
    expect(deriveCyclePersonality(cycleAt(0)).pill).toContain("SHOT DAY");
  });
});

describe("greetingForHour", () => {
  it("greets by part of day and first name only", () => {
    expect(greetingForHour(8, "Nick Milien")).toBe("Morning, Nick.");
    expect(greetingForHour(14, null)).toBe("Afternoon.");
    expect(greetingForHour(20, "Sam")).toBe("Evening, Sam.");
  });
});

describe("morningPill", () => {
  it("prefers yesterday's protein, falls back to the journey chip, then hides", () => {
    expect(morningPill({ yesterdayProtein: 96.4, dayOnMed: 46, medicationName: "Wegovy" })).toEqual({
      label: "96g yesterday",
      check: true,
    });
    expect(morningPill({ yesterdayProtein: 0, dayOnMed: 46, medicationName: "Wegovy" })).toEqual({
      label: "Day 46 · Wegovy",
      check: false,
    });
    expect(morningPill({ yesterdayProtein: 0, dayOnMed: null })).toBeNull();
  });
});

describe("derivePersonalPattern", () => {
  // Shot Saturdays; now = Thursday Jul 16 → today is day 5 of the cycle.
  const now = new Date("2026-07-16T09:00:00");
  const base = {
    dailyProteinTarget: 120,
    shotDays: ["saturday"],
    todayDaysSinceShot: 5,
    now,
    fallback: "cycle truth",
  };
  const day5meal = (iso: string, protein: number) => ({ protein, recordedAt: iso });

  it("speaks from their data when today's position dipped twice", () => {
    const meals = [
      day5meal("2026-07-09T12:00:00", 60), // prior Thursday (day 5), missed
      day5meal("2026-07-02T12:00:00", 70), // Thursday before, missed
      day5meal("2026-07-13T12:00:00", 130), // Monday (day 2) — ignored
    ];
    expect(derivePersonalPattern({ ...base, meals })).toBe(
      "Day 5 dipped in your recent cycles. We plan for it now.",
    );
  });

  it("celebrates a held position and falls back when history is thin", () => {
    const held = [day5meal("2026-07-09T12:00:00", 125), day5meal("2026-07-02T12:00:00", 130)];
    expect(derivePersonalPattern({ ...base, meals: held })).toContain("held strong");
    expect(derivePersonalPattern({ ...base, meals: [held[0]] })).toBe("cycle truth");
    expect(derivePersonalPattern({ ...base, meals: held, shotDays: [] })).toBe("cycle truth");
  });

  it("never counts today's unfinished logs", () => {
    const meals = [
      day5meal("2026-07-16T08:00:00", 10), // today — excluded
      day5meal("2026-07-09T12:00:00", 60),
      day5meal("2026-07-02T12:00:00", 70),
    ];
    expect(derivePersonalPattern({ ...base, meals })).toContain("dipped");
  });
});

describe("proteinLoggedYesterday", () => {
  it("sums only meals recorded on the previous calendar day", () => {
    const now = new Date("2026-07-13T09:00:00");
    const meals = [
      { protein: 40, recordedAt: "2026-07-12T08:00:00" },
      { protein: 56, recordedAt: "2026-07-12T19:30:00" },
      { protein: 30, recordedAt: "2026-07-13T07:00:00" },
      { protein: 25, recordedAt: "2026-07-11T12:00:00" },
    ];
    expect(proteinLoggedYesterday(meals, now)).toBe(96);
  });
});

describe("schedule sync (multi-day and frequency changes)", () => {
  it("defense keys to the NEXT shot, so twice-weekly users guard the right days", () => {
    // Wed+Thu shooter on Tuesday: 5 days since Thu, but next shot is tomorrow.
    expect(deriveCyclePersonality(cycleAt(5, 1)).kind).toBe("defense");
    // Same distance from a shot but mid-cycle (next shot 4 days out): steady.
    expect(deriveCyclePersonality(cycleAt(5, 4)).kind).toBe("steady");
  });
});

describe("buildCycleRibbon", () => {
  it("marks every scheduled shot day in the window (Wed+Thu shooter)", () => {
    // Friday, one day after the Thursday shot.
    const cells = buildCycleRibbon({
      daysSinceShot: 1,
      shotDays: ["wednesday", "thursday"],
      now: new Date("2026-07-17T12:00:00"), // Friday
    });
    expect(cells.map((c) => c.label)).toEqual(["SHOT", "+1", "+2", "+3", "+4", "+5", "SHOT"]);
    expect(cells.filter((c) => c.isShot)).toHaveLength(2);
  });

  it("reduces to the classic weekly arc for a single shot day", () => {
    const cells = buildCycleRibbon({
      daysSinceShot: 5,
      shotDays: ["saturday"],
      now: new Date("2026-07-16T12:00:00"), // Thursday
    });
    expect(cells.map((c) => c.label)).toEqual(["SHOT", "+1", "+2", "+3", "+4", "+5", "+6"]);
  });
});
