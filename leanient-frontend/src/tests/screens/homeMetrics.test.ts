import { describe, expect, it } from "vitest";
import type { DoseLog } from "@leanient/shared";
import { mockMedicationProtocol, mockProfile } from "../../mocks/home";
import { deriveHomeMetrics } from "../../screens/app/homeMetrics";

const STAMP = "2026-06-01T12:00:00.000Z";

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
