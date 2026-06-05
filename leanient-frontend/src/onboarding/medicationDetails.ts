import type { DoseUnit, MedicationCatalogItem } from "@leanient/shared";

/**
 * Pure derivation for the onboarding Medication Details screen (Variant A:
 * dose unit derived from the catalog, not asked of the user).
 *
 * The backend medication contract requires `doseUnit` + `startDate`; the GLP
 * picker only captures the medication name/catalog id, so this screen fills the
 * rest. The unit is the one fact we genuinely know from the catalog (every GLP-1
 * pen doses in the same unit), so we set it silently and show it read-only. The
 * starting dose, when the catalog lists a titration ladder, is offered as a
 * sensible default the user can change later in settings.
 */

export interface MedicationDetailsView {
  /** Brand/medication name for the headline, e.g. "Wegovy". */
  medName: string;
  /** Derived from the selected medication's catalog entry. */
  doseUnit: DoseUnit;
  /** The catalog's starting dose, when known (titration ladder's first step). */
  doseAmount?: number;
  /** Read-only display, e.g. "0.25 mg per dose" or "Measured in mg". */
  doseLabel: string;
  /** Whether a numeric starting dose was derivable. */
  hasDerivedAmount: boolean;
}

/** Format a dose number for display: whole numbers show one decimal ("1.0"). */
export function formatDose(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function deriveMedicationDetails(args: {
  catalog: MedicationCatalogItem[];
  medicationCatalogId?: string;
  medicationName?: string;
}): MedicationDetailsView {
  const item = args.medicationCatalogId
    ? args.catalog.find((c) => c.id === args.medicationCatalogId)
    : undefined;

  const doseUnit: DoseUnit = item?.doseUnits[0] ?? "mg";
  const doseAmount = item?.supportedDoseValues[0];
  const medName =
    args.medicationName ?? item?.brandNames[0] ?? item?.genericName ?? "your medication";
  const doseLabel =
    doseAmount != null ? `${formatDose(doseAmount)} ${doseUnit} per dose` : `Measured in ${doseUnit}`;

  return { medName, doseUnit, doseAmount, doseLabel, hasDerivedAmount: doseAmount != null };
}

// ---- Start-date helpers (month index is 0-based, matching JS Date) ----

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface DateParts {
  year: number;
  month: number; // 0-11
  day: number;
}

export function toDateParts(now: Date): DateParts {
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamp the day to the selected month's length (e.g. Feb 31 -> Feb 28/29). */
export function clampDay(parts: DateParts): DateParts {
  return { ...parts, day: Math.min(parts.day, daysInMonth(parts.year, parts.month)) };
}

/** A medication start date cannot be in the future; clamp it back to today. */
export function clampToToday(parts: DateParts, now: Date): DateParts {
  const clamped = clampDay(parts);
  const selected = new Date(clamped.year, clamped.month, clamped.day).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return selected > today ? toDateParts(now) : clamped;
}

export function toIsoDate(parts: DateParts): string {
  const c = clampDay(parts);
  const m = String(c.month + 1).padStart(2, "0");
  const d = String(c.day).padStart(2, "0");
  return `${c.year}-${m}-${d}`;
}

export function formatLongDate(parts: DateParts): string {
  const c = clampDay(parts);
  return `${MONTHS_SHORT[c.month]} ${c.day}, ${c.year}`;
}

/** Ascending list of selectable years, ending at the current year. */
export function startYearRange(now: Date, yearsBack = 4): number[] {
  const current = now.getFullYear();
  return Array.from({ length: yearsBack + 1 }, (_, i) => current - yearsBack + i);
}
