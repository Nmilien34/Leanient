import type { Weekday } from "@leanient/shared";

/**
 * Onboarding shot-day options + coaching copy. The backend medication contract
 * requires `shotDay` (a `Weekday`); this screen captures it. Options are shown in
 * familiar calendar order (Sunday first), while the stored value is the shared
 * `Weekday` enum string.
 */

export interface ShotDayOption {
  key: Weekday;
  short: string; // chip label, e.g. "Sun"
  long: string; // used in copy, e.g. "Sunday"
}

export const SHOT_DAY_OPTIONS: ShotDayOption[] = [
  { key: "sunday", short: "Sun", long: "Sunday" },
  { key: "monday", short: "Mon", long: "Monday" },
  { key: "tuesday", short: "Tue", long: "Tuesday" },
  { key: "wednesday", short: "Wed", long: "Wednesday" },
  { key: "thursday", short: "Thu", long: "Thursday" },
  { key: "friday", short: "Fri", long: "Friday" },
  { key: "saturday", short: "Sat", long: "Saturday" },
];

/**
 * A calm coaching line once a day is chosen, naming the medication when known.
 * Returns null before a day is selected (the screen shows nothing then).
 */
export function shotDayCoachNote(medName: string | undefined, day: Weekday | null): string | null {
  if (!day) return null;
  const long = SHOT_DAY_OPTIONS.find((o) => o.key === day)?.long ?? "that day";
  const subject = medName ? `You take ${medName}` : "You take your shot";
  return `${subject} on ${long}s. We'll keep workouts lighter right around it.`;
}
