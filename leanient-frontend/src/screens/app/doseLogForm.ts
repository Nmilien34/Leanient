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
  return {
    medicationProtocolId: protocol.id,
    doseAmount: protocol.doseAmount ?? 0,
    // protocol.doseUnit ("mg" | "units") is a subset of DoseLogUnit.
    doseUnit: protocol.doseUnit as DoseLogUnit,
    injectionSite: site,
    recordedAt,
  };
}
