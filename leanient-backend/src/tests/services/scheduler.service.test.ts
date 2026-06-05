import { describe, expect, it } from "vitest";
import {
  getPreviousLeanientWeek,
  shouldCreateNoDataVerdict,
} from "../../services/scheduler.service";

describe("scheduler service", () => {
  it("targets the previous Monday week when cron runs on Monday morning", () => {
    const week = getPreviousLeanientWeek(new Date("2026-06-01T13:00:00.000Z"));

    expect(week.weekOf).toBe("2026-05-25");
  });

  it("still targets the prior complete week if the job runs later in the week", () => {
    const week = getPreviousLeanientWeek(new Date("2026-06-05T18:00:00.000Z"));

    expect(week.weekOf).toBe("2026-05-25");
  });

  it("creates no_data only when both check-in and verdict are missing", () => {
    expect(shouldCreateNoDataVerdict({ hasCheckin: false, hasVerdict: false })).toBe(true);
    expect(shouldCreateNoDataVerdict({ hasCheckin: true, hasVerdict: false })).toBe(false);
    expect(shouldCreateNoDataVerdict({ hasCheckin: false, hasVerdict: true })).toBe(false);
  });
});
