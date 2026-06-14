import type { User } from "@leanient/shared";

/**
 * FRONTEND helper for the on-device facial-volume tracking gate. Reads the
 * consent timestamp off the user and turns it into a display state for the
 * consent screen and the Progress-tab entry.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface FaceConsentState {
  enabled: boolean;
  /** "May 12, 2026" when consented; null otherwise. */
  sinceLabel: string | null;
  /** Entry-row copy that reflects the state. */
  entryLabel: string;
}

export function faceConsentState(user: User | null | undefined): FaceConsentState {
  const at = user?.faceAnalysisConsentAt;
  if (!at) {
    return { enabled: false, sinceLabel: null, entryLabel: "Turn on facial volume tracking" };
  }

  const date = new Date(at);
  const sinceLabel = Number.isNaN(date.getTime())
    ? null
    : `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  return { enabled: true, sinceLabel, entryLabel: "Facial volume tracking is on" };
}
