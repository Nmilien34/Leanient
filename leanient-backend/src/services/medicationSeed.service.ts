import { MedicationCatalogItemModel } from "../models/medicationCatalogItem.model";

const MEDICATION_SEEDS = [
  {
    slug: "semaglutide",
    genericName: "Semaglutide",
    brandNames: ["Ozempic", "Wegovy"],
    drugClass: "glp_1" as const,
    doseUnits: ["mg" as const],
    supportedDoseValues: [0.25, 0.5, 1, 1.7, 2, 2.4],
    active: true,
    displayOrder: 10,
  },
  {
    slug: "tirzepatide",
    genericName: "Tirzepatide",
    brandNames: ["Mounjaro", "Zepbound"],
    drugClass: "dual_glp_1_gip" as const,
    doseUnits: ["mg" as const],
    supportedDoseValues: [2.5, 5, 7.5, 10, 12.5, 15],
    active: true,
    displayOrder: 20,
  },
  {
    slug: "liraglutide",
    genericName: "Liraglutide",
    brandNames: ["Saxenda", "Victoza"],
    drugClass: "glp_1" as const,
    doseUnits: ["mg" as const],
    supportedDoseValues: [0.6, 1.2, 1.8, 2.4, 3],
    active: true,
    displayOrder: 30,
  },
  {
    slug: "other",
    genericName: "Other",
    brandNames: ["Other"],
    drugClass: "other" as const,
    doseUnits: ["mg" as const, "units" as const],
    supportedDoseValues: [],
    active: true,
    displayOrder: 999,
  },
];

export async function seedMedicationCatalog(): Promise<number> {
  await Promise.all(
    MEDICATION_SEEDS.map((medication) =>
      MedicationCatalogItemModel.updateOne(
        { slug: medication.slug },
        { $set: medication },
        { upsert: true },
      ),
    ),
  );

  return MEDICATION_SEEDS.length;
}
