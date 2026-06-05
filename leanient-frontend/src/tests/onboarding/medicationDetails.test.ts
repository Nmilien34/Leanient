import { describe, expect, it } from "vitest";
import type { MedicationCatalogItem } from "@leanient/shared";
import {
  clampToToday,
  daysInMonth,
  deriveMedicationDetails,
  formatDose,
  formatLongDate,
  startYearRange,
  toDateParts,
  toIsoDate,
} from "../../onboarding/medicationDetails";

const STAMP = "2025-01-01T00:00:00.000Z";
function med(over: Partial<MedicationCatalogItem>): MedicationCatalogItem {
  return {
    id: "med_wegovy",
    slug: "wegovy",
    genericName: "semaglutide",
    brandNames: ["Wegovy"],
    drugClass: "glp_1",
    doseUnits: ["mg"],
    supportedDoseValues: [0.25, 0.5, 1, 1.7, 2.4],
    active: true,
    displayOrder: 2,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...over,
  };
}

describe("deriveMedicationDetails", () => {
  const catalog = [med({}), med({ id: "med_compounded", brandNames: [], genericName: "compounded semaglutide", supportedDoseValues: [] })];

  it("derives the unit and starting dose from the selected medication", () => {
    const view = deriveMedicationDetails({ catalog, medicationCatalogId: "med_wegovy", medicationName: "Wegovy" });
    expect(view).toMatchObject({
      medName: "Wegovy",
      doseUnit: "mg",
      doseAmount: 0.25,
      doseLabel: "0.25 mg per dose",
      hasDerivedAmount: true,
    });
  });

  it("falls back to a unit-only label when the catalog has no dose ladder", () => {
    const view = deriveMedicationDetails({ catalog, medicationCatalogId: "med_compounded" });
    expect(view.doseUnit).toBe("mg");
    expect(view.hasDerivedAmount).toBe(false);
    expect(view.doseLabel).toBe("Measured in mg");
    expect(view.medName).toBe("compounded semaglutide");
  });

  it("uses safe fallbacks when the medication is not in the catalog", () => {
    const view = deriveMedicationDetails({ catalog, medicationCatalogId: "unknown", medicationName: "Custom" });
    expect(view).toMatchObject({ medName: "Custom", doseUnit: "mg", hasDerivedAmount: false });
  });
});

describe("formatDose", () => {
  it("pads whole numbers to one decimal, leaves fractions as-is", () => {
    expect(formatDose(1)).toBe("1.0");
    expect(formatDose(0.25)).toBe("0.25");
    expect(formatDose(2.4)).toBe("2.4");
  });
});

describe("start-date helpers", () => {
  const now = new Date(2026, 5, 4); // Jun 4, 2026 (local)

  it("knows month lengths including leap years", () => {
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026
    expect(daysInMonth(2024, 1)).toBe(29); // Feb 2024 (leap)
    expect(daysInMonth(2026, 3)).toBe(30); // Apr 2026
  });

  it("formats and serializes a date", () => {
    const parts = { year: 2026, month: 4, day: 9 }; // May 9, 2026
    expect(formatLongDate(parts)).toBe("May 9, 2026");
    expect(toIsoDate(parts)).toBe("2026-05-09");
  });

  it("clamps an out-of-range day to the month length", () => {
    expect(toIsoDate({ year: 2026, month: 1, day: 31 })).toBe("2026-02-28");
  });

  it("clamps a future date back to today", () => {
    expect(clampToToday({ year: 2027, month: 0, day: 1 }, now)).toEqual(toDateParts(now));
    // a past date is preserved
    expect(clampToToday({ year: 2026, month: 0, day: 10 }, now)).toEqual({ year: 2026, month: 0, day: 10 });
  });

  it("offers an ascending year range ending at the current year", () => {
    expect(startYearRange(now, 4)).toEqual([2022, 2023, 2024, 2025, 2026]);
  });
});
