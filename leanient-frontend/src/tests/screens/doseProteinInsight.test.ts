import { describe, expect, it } from "vitest";
import type { DoseLog, MuscleRetentionSnapshot } from "@leanient/shared";
import { buildDoseProteinInsight } from "../../screens/app/doseProteinInsight";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function dose(recordedAt: string, doseAmount: number): Pick<DoseLog, "doseAmount" | "doseUnit" | "recordedAt"> {
  return { recordedAt, doseAmount, doseUnit: "mg" };
}

function snap(weekOf: string, proteinScore: number): Pick<MuscleRetentionSnapshot, "proteinScore" | "weekOf"> {
  return { weekOf, proteinScore };
}

describe("buildDoseProteinInsight", () => {
  it("returns null when the dose never increased", () => {
    const insight = buildDoseProteinInsight({
      doseLogs: [dose("2026-05-01T00:00:00.000Z", 0.5), dose("2026-05-08T00:00:00.000Z", 0.5)],
      snapshots: [snap("2026-05-04T00:00:00.000Z", 80)],
      now: NOW,
    });
    expect(insight).toBeNull();
  });

  it("returns null without adherence data on both sides of the bump", () => {
    const insight = buildDoseProteinInsight({
      doseLogs: [dose("2026-05-01T00:00:00.000Z", 0.5), dose("2026-05-22T00:00:00.000Z", 1.0)],
      snapshots: [snap("2026-06-01T00:00:00.000Z", 70)], // only after the increase
      now: NOW,
    });
    expect(insight).toBeNull();
  });

  it("flags a protein drop after the most recent dose increase", () => {
    const insight = buildDoseProteinInsight({
      doseLogs: [
        dose("2026-05-01T00:00:00.000Z", 0.5),
        dose("2026-05-25T00:00:00.000Z", 1.0), // the increase
        dose("2026-06-01T00:00:00.000Z", 1.0),
      ],
      snapshots: [
        snap("2026-05-04T00:00:00.000Z", 88),
        snap("2026-05-11T00:00:00.000Z", 90),
        snap("2026-06-01T00:00:00.000Z", 70),
        snap("2026-06-08T00:00:00.000Z", 72),
      ],
      now: NOW,
    });
    expect(insight).not.toBeNull();
    expect(insight!.direction).toBe("dropped");
    expect(insight!.toDose).toBe(1);
    expect(insight!.beforePct).toBe(89); // avg(88,90)
    expect(insight!.afterPct).toBe(71); // avg(70,72)
    expect(insight!.weeksSince).toBe(3);
    expect(insight!.body).toContain("1 mg");
  });

  it("affirms when protein held through the increase, using the latest increase", () => {
    const insight = buildDoseProteinInsight({
      doseLogs: [
        dose("2026-04-01T00:00:00.000Z", 0.25),
        dose("2026-04-20T00:00:00.000Z", 0.5), // older increase
        dose("2026-05-25T00:00:00.000Z", 1.0), // latest increase — this one is used
      ],
      snapshots: [
        snap("2026-05-11T00:00:00.000Z", 84),
        snap("2026-06-01T00:00:00.000Z", 86),
      ],
      now: NOW,
    });
    expect(insight!.direction).toBe("held");
    expect(insight!.toDose).toBe(1);
    expect(insight!.afterPct).toBe(86);
  });
});
