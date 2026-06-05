import type { MedicationCatalogItem } from "@leanient/shared";

/**
 * Stand-in for `GET /medications` during frontend dev. Typed against the shared
 * `MedicationCatalogItem`, so a contract change breaks this file at compile time.
 * Swap for the real `LeanientDataContext.getMedicationCatalog()` at integration.
 */
const STAMP = "2025-01-01T00:00:00.000Z";

export const mockMedicationCatalog: MedicationCatalogItem[] = [
  {
    id: "med_ozempic",
    slug: "ozempic",
    genericName: "semaglutide",
    brandNames: ["Ozempic"],
    drugClass: "glp_1",
    doseUnits: ["mg"],
    supportedDoseValues: [0.25, 0.5, 1, 2],
    active: true,
    displayOrder: 1,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
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
  },
  {
    id: "med_mounjaro",
    slug: "mounjaro",
    genericName: "tirzepatide",
    brandNames: ["Mounjaro"],
    drugClass: "dual_glp_1_gip",
    doseUnits: ["mg"],
    supportedDoseValues: [2.5, 5, 7.5, 10, 12.5, 15],
    active: true,
    displayOrder: 3,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "med_zepbound",
    slug: "zepbound",
    genericName: "tirzepatide",
    brandNames: ["Zepbound"],
    drugClass: "dual_glp_1_gip",
    doseUnits: ["mg"],
    supportedDoseValues: [2.5, 5, 7.5, 10, 12.5, 15],
    active: true,
    displayOrder: 4,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "med_compounded",
    slug: "compounded",
    genericName: "compounded semaglutide or tirzepatide",
    brandNames: ["Compounded"],
    drugClass: "other",
    doseUnits: ["mg", "units"],
    supportedDoseValues: [],
    active: true,
    displayOrder: 5,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
];
