import { describe, expect, it } from "vitest";
import { WEEKDAYS } from "@leanient/shared";
import { SHOT_DAY_OPTIONS, shotDayCoachNote } from "../../onboarding/shotDay";

describe("SHOT_DAY_OPTIONS", () => {
  it("covers every Weekday exactly once", () => {
    expect([...SHOT_DAY_OPTIONS.map((o) => o.key)].sort()).toEqual([...WEEKDAYS].sort());
  });

  it("is shown in calendar order, Sunday first", () => {
    expect(SHOT_DAY_OPTIONS.map((o) => o.short)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });
});

describe("shotDayCoachNote", () => {
  it("returns null until a day is chosen", () => {
    expect(shotDayCoachNote("Wegovy", null)).toBeNull();
  });

  it("names the medication and the selected day", () => {
    expect(shotDayCoachNote("Wegovy", "saturday")).toBe(
      "You take Wegovy on Saturdays. We'll keep workouts lighter right around it.",
    );
  });

  it("falls back to a generic subject when the medication is unknown", () => {
    expect(shotDayCoachNote(undefined, "monday")).toBe(
      "You take your shot on Mondays. We'll keep workouts lighter right around it.",
    );
  });
});
