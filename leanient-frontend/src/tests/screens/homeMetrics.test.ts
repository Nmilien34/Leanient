import { describe, expect, it } from "vitest";
import type { DoseLog, WeeklyVerdict, WeightLog } from "@leanient/shared";
import { mockMedicationProtocol, mockProfile } from "../../mocks/home";
import { deriveHomeMetrics, weighInDeltaThisWeek } from "../../screens/app/homeMetrics";

const STAMP = "2026-06-01T12:00:00.000Z";

function verdictWith(inputsUsed: WeeklyVerdict["inputsUsed"]): WeeklyVerdict {
  return {
    id: "verdict_1",
    userId: "user_demo",
    weeklyCheckinId: "checkin_1",
    weekOf: "2026-06-01",
    status: "drifting",
    nextActionCode: "log_workout",
    explanation: "Drifting.",
    factors: [],
    inputsUsed,
    createdAt: STAMP,
    updatedAt: STAMP,
  } as WeeklyVerdict;
}

function weightLog(value: number, measuredAt: string): WeightLog {
  return {
    id: `w_${measuredAt}`,
    userId: "user_demo",
    value,
    unit: "lb",
    measuredAt,
    source: "manual",
    createdAt: measuredAt,
    updatedAt: measuredAt,
  };
}

function doseLog(recordedAt: string): DoseLog {
  return {
    id: "dose_1",
    userId: "user_demo",
    recordedAt,
    deletedAt: null,
    medicationProtocolId: mockMedicationProtocol.id,
    doseAmount: 1,
    doseUnit: "mg",
    injectionSite: "abdomen_left",
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

describe("deriveHomeMetrics dose labels", () => {
  it("prefers the most recent dose log for the last-dose label", () => {
    const now = new Date("2026-06-03T15:00:00.000Z");
    const metrics = deriveHomeMetrics({
      verdict: {
        id: "verdict_1",
        userId: "user_demo",
        weeklyCheckinId: "checkin_1",
        weekOf: "2026-06-01",
        status: "on_track",
        nextActionCode: "log_workout",
        explanation: "On track.",
        factors: [],
        inputsUsed: {},
        createdAt: STAMP,
        updatedAt: STAMP,
      },
      profile: mockProfile,
      weightLogs: [],
      medication: {
        ...mockMedicationProtocol,
        shotDays: ["saturday"],
      },
      doseLogs: [doseLog("2026-06-03T14:30:00.000Z")],
      now,
    });

    expect(metrics.dose.lastLabel).toBe("Today");
    expect(metrics.dose.nextLabel).toBe("in 3 days");
  });
});

describe("deriveHomeMetrics weekly rings", () => {
  const now = new Date("2026-06-03T15:00:00.000Z"); // Wednesday; week starts Mon Jun 1

  it("regression: a tapped-through check-in no longer renders a full protein ring", () => {
    // The check-in self-reported the daily target (120) with zero meals logged.
    // Live week logs (none beyond one shake) must beat the stale snapshot.
    const metrics = deriveHomeMetrics({
      verdict: verdictWith({ proteinGramsPerDay: 120, resistanceWorkoutsCompleted: 0 }),
      profile: mockProfile,
      weightLogs: [],
      weekMeals: [{ protein: 38 }],
      sessionsThisWeek: 0,
      now,
    });
    expect(metrics.protein.logged).toBe(38);
    expect(metrics.protein.target).toBe(840); // 120 * 7
    expect(metrics.protein.ratio).toBeCloseTo(38 / 840);
    expect(metrics.training.done).toBe(0);
  });

  it("falls back to the verdict snapshot when no live data is available", () => {
    const metrics = deriveHomeMetrics({
      verdict: verdictWith({ proteinGramsPerDay: 100, resistanceWorkoutsCompleted: 2 }),
      profile: mockProfile,
      weightLogs: [],
      now,
    });
    expect(metrics.protein.logged).toBe(700);
    expect(metrics.training.done).toBe(2);
  });

  it("prefers the live session count over the snapshot", () => {
    const metrics = deriveHomeMetrics({
      verdict: verdictWith({ resistanceWorkoutsCompleted: 0 }),
      profile: mockProfile,
      weightLogs: [],
      sessionsThisWeek: 2,
      now,
    });
    expect(metrics.training.done).toBe(2);
    expect(metrics.training.ratio).toBeCloseTo(2 / 3);
  });
});

describe("weighInDeltaThisWeek", () => {
  const now = new Date("2026-06-03T15:00:00.000Z"); // week of Mon Jun 1

  it("is null when nothing was weighed this week, whatever the history", () => {
    expect(weighInDeltaThisWeek([], now)).toBeNull();
    expect(weighInDeltaThisWeek([weightLog(190, "2026-05-12T08:00:00.000Z")], now)).toBeNull();
  });

  it("compares this week's latest weigh-in against the last one before the week", () => {
    const logs = [
      weightLog(192, "2026-05-20T08:00:00.000Z"),
      weightLog(190, "2026-05-29T08:00:00.000Z"), // baseline (before Mon Jun 1)
      weightLog(188.6, "2026-06-02T08:00:00.000Z"),
    ];
    expect(weighInDeltaThisWeek(logs, now)).toBeCloseTo(-1.4);
  });

  it("uses the week's first weigh-in as baseline when there is no earlier history", () => {
    const logs = [
      weightLog(190, "2026-06-01T08:00:00.000Z"),
      weightLog(189, "2026-06-03T08:00:00.000Z"),
    ];
    expect(weighInDeltaThisWeek(logs, now)).toBe(-1);
  });
});
