import { describe, expect, it } from "vitest";
import { deriveMedication } from "../../screens/app/medicationMetrics";
import { mockMedicationProtocol } from "../../mocks/home";
import { mockMedicationCatalog } from "../../mocks/medications";

const now = new Date(2026, 5, 3); // Wed, Jun 3 2026

function view(overrides = {}) {
  return deriveMedication({
    protocol: { ...mockMedicationProtocol, ...overrides },
    catalog: mockMedicationCatalog,
    now,
  });
}

describe("deriveMedication", () => {
  it("formats the current med, dose, and shot day from the protocol", () => {
    const v = view(); // Wegovy 1 mg, shotDay saturday, started 2026-04-20
    expect(v.medicationName).toBe("Wegovy");
    expect(v.doseLabel).toBe("1.0 mg");
    expect(v.shotDayName).toBe("Saturday");
    expect(v.startedLabel).toBe("Apr 20, 2026");
  });

  it("computes the next-dose summary from the shot cycle", () => {
    // Wed → Saturday shot is 3 days out.
    const v = view({ shotDay: "saturday" });
    expect(v.currentSummary).toBe("Saturdays · next shot in 3 days");
  });

  it("builds the titration ladder from the catalog, marking the current dose 'now'", () => {
    const v = view(); // Wegovy ladder [0.25, 0.5, 1, 1.7, 2.4], current 1
    expect(v.titration.map((s) => s.state)).toEqual(["done", "done", "now", "future", "future"]);
    expect(v.titration.map((s) => s.label)).toEqual(["0.25", "0.5", "1.0 mg · now", "1.7", "2.4"]);
  });

  it("reflects a different current dose in the ladder", () => {
    const v = view({ doseAmount: 1.7 });
    expect(v.titration.map((s) => s.state)).toEqual(["done", "done", "done", "now", "future"]);
    expect(v.titration.find((s) => s.state === "now")?.label).toBe("1.7 mg · now");
  });

  it("returns no ladder for a medication without supported dose values", () => {
    const v = view({ medicationCatalogId: "med_compounded" });
    expect(v.titration).toEqual([]);
  });
});
