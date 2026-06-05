import type { DoseLog, UserMedicationProtocol } from "@leanient/shared";
import { describe, expect, it } from "vitest";
import { computeShotDayContext } from "../../lib/shotDay";

function protocol(overrides: Partial<UserMedicationProtocol> = {}): UserMedicationProtocol {
  return {
    id: "protocol_1",
    userId: "user_1",
    medicationName: "Zepbound",
    doseUnit: "mg",
    shotDay: "monday",
    startDate: "2026-06-01",
    active: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function dose(recordedAt: string): DoseLog {
  return {
    id: `dose_${recordedAt}`,
    userId: "user_1",
    recordedAt,
    medicationProtocolId: "protocol_1",
    doseAmount: 5,
    doseUnit: "mg",
    deletedAt: null,
    createdAt: recordedAt,
    updatedAt: recordedAt,
  };
}

describe("computeShotDayContext", () => {
  it("returns inactive context when there is no active protocol", () => {
    expect(computeShotDayContext(null, [], new Date("2026-06-03T12:00:00.000Z"))).toEqual({
      isOnProtocol: false,
      daysSinceLastDose: null,
      daysUntilNextDose: null,
      shotDayLabel: null,
      nextDoseDate: null,
    });
    expect(
      computeShotDayContext(
        protocol({ active: false }),
        [],
        new Date("2026-06-03T12:00:00.000Z"),
      ).isOnProtocol,
    ).toBe(false);
  });

  it("uses startDate as the implied last dose when there are no dose logs", () => {
    const context = computeShotDayContext(
      protocol({ startDate: "2026-06-01" }),
      [],
      new Date("2026-06-03T12:00:00.000Z"),
    );

    expect(context.daysSinceLastDose).toBe(2);
    expect(context.shotDayLabel).toBe("SHOT DAY +2");
    expect(context.daysUntilNextDose).toBe(5);
    expect(context.nextDoseDate?.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });

  it.each([
    ["2026-06-03T08:00:00.000Z", "2026-06-03T18:00:00.000Z", 0, "SHOT DAY", 7],
    ["2026-06-01T08:00:00.000Z", "2026-06-03T18:00:00.000Z", 2, "SHOT DAY +2", 5],
    ["2026-05-28T08:00:00.000Z", "2026-06-03T18:00:00.000Z", 6, "SHOT DAY +6", 1],
    ["2026-05-27T08:00:00.000Z", "2026-06-03T18:00:00.000Z", 7, "SHOT DAY", 0],
  ])(
    "computes label and next-dose timing from recent dose",
    (recordedAt, today, daysSince, label, daysUntil) => {
      const context = computeShotDayContext(protocol(), [dose(recordedAt)], new Date(today));

      expect(context.daysSinceLastDose).toBe(daysSince);
      expect(context.shotDayLabel).toBe(label);
      expect(context.daysUntilNextDose).toBe(daysUntil);
    },
  );

  it("uses UTC day boundaries instead of elapsed hours", () => {
    const context = computeShotDayContext(
      protocol(),
      [dose("2026-06-01T23:00:00.000Z")],
      new Date("2026-06-02T01:00:00.000Z"),
    );

    expect(context.daysSinceLastDose).toBe(1);
    expect(context.shotDayLabel).toBe("SHOT DAY +1");
  });

  it("uses the most recent dose log", () => {
    const context = computeShotDayContext(
      protocol(),
      [dose("2026-05-27T08:00:00.000Z"), dose("2026-06-02T08:00:00.000Z")],
      new Date("2026-06-03T18:00:00.000Z"),
    );

    expect(context.daysSinceLastDose).toBe(1);
    expect(context.shotDayLabel).toBe("SHOT DAY +1");
  });
});
