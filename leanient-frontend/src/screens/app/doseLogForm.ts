import type { DoseInjectionSite, DoseLogUnit, UserMedicationProtocol } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Dose screen (36). The core behavior is
 * injection-site rotation: given the last site used, suggest the next one so the
 * user spreads injections out (avoids soreness/lipohypertrophy).
 * `buildDoseLogDraft` maps the form to the shared `DoseLog` contract.
 */

// Front-of-body injectable sites shown on the map (buttocks omitted from the front view).
export const MAP_SITES: DoseInjectionSite[] = ["abdomen_left", "abdomen_right", "thigh_left", "thigh_right", "arm_left", "arm_right"];

// Rotation order — stepping one position each dose moves to a fresh site.
const ROTATION: DoseInjectionSite[] = ["abdomen_left", "abdomen_right", "thigh_left", "thigh_right", "arm_left", "arm_right"];

export function suggestNextSite(last: DoseInjectionSite | null): DoseInjectionSite {
  if (!last) return ROTATION[0];
  const i = ROTATION.indexOf(last);
  return i === -1 ? ROTATION[0] : ROTATION[(i + 1) % ROTATION.length];
}

const REGION_LABEL: Record<string, string> = {
  abdomen: "abdomen",
  thigh: "thigh",
  arm: "arm",
  buttock: "buttock",
};

export function siteLabel(site: DoseInjectionSite): string {
  const [region, side] = site.split("_");
  return `${side === "left" ? "Left" : "Right"} ${REGION_LABEL[region] ?? region}`;
}

/** The coaching line under the body map, reflecting the rotation. */
export function siteHint(selected: DoseInjectionSite, suggested: DoseInjectionSite, last: DoseInjectionSite | null): string {
  if (last && selected === last) return "You injected here last time. Rotating helps avoid soreness.";
  if (selected === suggested) {
    return last ? `Suggested next. You used ${siteLabel(last)} last week, so rotate to avoid soreness.` : "Suggested to start your rotation.";
  }
  return last ? `You used ${siteLabel(last)} last week.` : "Pick where you injected.";
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface DoseCalendarCell {
  key: string;
  day: number | null;
  year: number;
  month: number;
  isSelected: boolean;
  isToday: boolean;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(value: Date): string {
  let h = value.getHours();
  const m = value.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDoseLogWhen(value: Date, now: Date): string {
  const dateLabel = sameLocalDay(value, now) ? "Today" : `${MONTH_LABELS[value.getMonth()]} ${value.getDate()}`;
  return `${dateLabel} · ${formatTime(value)}`;
}

export function formatDoseCalendarMonth(value: Date): string {
  return `${MONTH_LABELS[value.getMonth()]} ${value.getFullYear()}`;
}

export function withDoseLogDate(previous: Date, year: number, month: number, day: number): Date {
  return new Date(
    year,
    month,
    day,
    previous.getHours(),
    previous.getMinutes(),
    previous.getSeconds(),
    previous.getMilliseconds(),
  );
}

export function buildDoseCalendarMonth(monthDate: Date, selectedDate: Date, today: Date): DoseCalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1 || day > daysInMonth) {
      return {
        key: `empty-${year}-${month}-${index}`,
        day: null,
        year,
        month,
        isSelected: false,
        isToday: false,
      };
    }

    const date = new Date(year, month, day);
    return {
      key: `${year}-${month}-${day}`,
      day,
      year,
      month,
      isSelected: sameLocalDay(date, selectedDate),
      isToday: sameLocalDay(date, today),
    };
  });
}

export interface DoseLogDraft {
  medicationProtocolId: string;
  doseAmount: number;
  doseUnit: DoseLogUnit;
  injectionSite: DoseInjectionSite;
  recordedAt: string;
}

export function buildDoseLogDraft(args: {
  protocol: UserMedicationProtocol;
  site: DoseInjectionSite;
  recordedAt: string;
}): DoseLogDraft {
  const { protocol, site, recordedAt } = args;
  if (protocol.doseAmount == null || protocol.doseAmount <= 0) {
    throw new Error("Set your dose amount in Medication settings before logging a dose.");
  }

  return {
    medicationProtocolId: protocol.id,
    doseAmount: protocol.doseAmount,
    // protocol.doseUnit ("mg" | "units") is a subset of DoseLogUnit.
    doseUnit: protocol.doseUnit as DoseLogUnit,
    injectionSite: site,
    recordedAt,
  };
}
