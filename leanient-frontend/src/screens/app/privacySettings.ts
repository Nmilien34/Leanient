/**
 * FRONTEND config for the Privacy & data screen (30). The sharing preferences
 * have no backend contract yet, so their on/off is local; these defaults stand
 * in until a `PrivacyPreferences` contract exists.
 */

export type SharingIcon = "shield" | "heart";

export interface SharingToggle {
  id: string;
  icon: SharingIcon;
  label: string;
  subtitle: string;
  defaultOn: boolean;
}

export const SHARING_TOGGLES: SharingToggle[] = [
  { id: "research", icon: "shield", label: "Anonymous research", subtitle: "Helps improve the verdict model", defaultOn: false },
  { id: "coaching", icon: "heart", label: "Personalized coaching", subtitle: "Uses your logs to tailor advice", defaultOn: true },
];

export function defaultSharingState(): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const t of SHARING_TOGGLES) state[t.id] = t.defaultOn;
  return state;
}

export function photosLabel(count: number): string {
  return count > 0 ? `${count} photo${count === 1 ? "" : "s"}` : "None yet";
}
