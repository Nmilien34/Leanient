import type { MedicationCatalogItem, UserMedicationProtocol } from "@leanient/shared";
import { computeShotCycle } from "./todayMetrics";

/**
 * FRONTEND-ONLY view aggregate for the Medication & schedule screen (26). Driven
 * by the user's `UserMedicationProtocol` plus the matching catalog item:
 *   - dose / shot day / next-dose from the protocol (+ shot cycle math)
 *   - the titration ladder from the catalog's `supportedDoseValues`, with the
 *     current dose marked "now", lower doses "done", higher "future"
 */

export type DoseState = "done" | "now" | "future";

export interface TitrationStep {
  value: number;
  label: string; // "0.25" or "1.0 mg · now"
  state: DoseState;
}

export interface MedicationView {
  medicationName: string;
  doseLabel: string; // "1.0 mg"
  shotDayName: string; // "Saturday"
  currentSummary: string; // "Saturdays · next shot in 5 days"
  startedLabel: string; // "Apr 20, 2026"
  titration: TitrationStep[]; // empty when the catalog has no ladder
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function deriveMedication(args: {
  protocol: UserMedicationProtocol;
  catalog: MedicationCatalogItem[];
  now: Date;
}): MedicationView {
  const { protocol, catalog, now } = args;

  const doseLabel = protocol.doseAmount != null ? `${protocol.doseAmount.toFixed(1)} ${protocol.doseUnit}` : "Not set";
  const shotDayName = protocol.shotDays.map(cap).join(", ");

  const cycle = computeShotCycle(protocol, now);
  const nextShot = cycle.daysUntilNext === 0 ? "today" : `in ${plural(cycle.daysUntilNext, "day")}`;

  const catalogItem = catalog.find((c) => c.id === protocol.medicationCatalogId);
  const current = protocol.doseAmount ?? null;
  const titration: TitrationStep[] = (catalogItem?.supportedDoseValues ?? []).map((value) => {
    const state: DoseState = current == null ? "future" : value < current ? "done" : value === current ? "now" : "future";
    return {
      value,
      label: state === "now" ? `${value.toFixed(1)} ${protocol.doseUnit} · now` : String(value),
      state,
    };
  });

  return {
    medicationName: protocol.medicationName,
    doseLabel,
    shotDayName,
    currentSummary: `${shotDayName}s · next shot ${nextShot}`,
    startedLabel: fmtDate(protocol.startDate),
    titration,
  };
}
