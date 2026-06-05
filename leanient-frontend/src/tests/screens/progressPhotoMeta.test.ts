import { describe, expect, it } from "vitest";
import { POSES, progressWeekNumber } from "../../screens/app/progressPhotoMeta";

describe("progressWeekNumber", () => {
  it("counts protocol weeks (1-based) from the start date", () => {
    const now = new Date(2026, 5, 3); // Jun 3 2026
    // Apr 20 → Jun 3 is 44 days → week 7.
    expect(progressWeekNumber("2026-04-20", now)).toBe(7);
    expect(progressWeekNumber("2026-06-01", now)).toBe(1); // first week
    expect(progressWeekNumber("2026-05-27", now)).toBe(2); // 7 days in
  });

  it("falls back to week 1 with no / bad start date", () => {
    const now = new Date(2026, 5, 3);
    expect(progressWeekNumber(undefined, now)).toBe(1);
    expect(progressWeekNumber("nonsense", now)).toBe(1);
  });

  it("offers front/side/back poses", () => {
    expect(POSES).toEqual(["Front", "Side", "Back"]);
  });
});
