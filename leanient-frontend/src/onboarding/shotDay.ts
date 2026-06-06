import type { Weekday } from "@leanient/shared";

/**
 * Onboarding shot-day options + coaching copy. The backend medication contract
 * stores `shotDays` (a non-empty `Weekday[]`); this screen captures one or more
 * days for split-dose protocols. Options are shown in familiar calendar order
 * (Sunday first); stored values are the shared `Weekday` enum strings.
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

const WEEK_ORDER: Weekday[] = SHOT_DAY_OPTIONS.map((o) => o.key);

/** Sort weekdays into calendar order (Sunday first), de-duplicated. */
export function sortShotDays(days: Weekday[]): Weekday[] {
  const set = new Set(days);
  return WEEK_ORDER.filter((day) => set.has(day));
}

/**
 * Format a set of shot days for copy, e.g. ["monday"] -> "Mondays",
 * ["monday","thursday"] -> "Mondays and Thursdays",
 * ["monday","wednesday","friday"] -> "Mondays, Wednesdays, and Fridays".
 * `style` picks short ("Mon") or long ("Monday") labels; long is pluralized.
 */
export function formatShotDays(days: Weekday[], style: "short" | "long" = "long"): string {
  const labels = sortShotDays(days).map((day) => {
    const option = SHOT_DAY_OPTIONS.find((o) => o.key === day);
    const base = option ? option[style] : day;
    return style === "long" ? `${base}s` : base;
  });
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * A calm coaching line once at least one day is chosen, naming the medication
 * when known. Returns null before any day is selected (screen shows nothing).
 */
export function shotDayCoachNote(medName: string | undefined, days: Weekday[]): string | null {
  if (days.length === 0) return null;
  const subject = medName ? `You take ${medName}` : "You take your shot";
  const around = days.length > 1 ? "them" : "it";
  return `${subject} on ${formatShotDays(days)}. We'll keep workouts lighter right around ${around}.`;
}
