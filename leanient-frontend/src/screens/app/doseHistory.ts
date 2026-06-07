import type { DoseLog } from "@leanient/shared";

/**
 * Shared formatting + selection helpers for the dose history (Home card, the
 * full history screen, and the dose detail view).
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Most-recent-first, with soft-deleted entries removed. */
export function sortRecentDoses(doses: DoseLog[]): DoseLog[] {
  return [...doses]
    .filter((d) => !d.deletedAt)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

/**
 * "Today" / "Yesterday" / "N days ago" for the past week, then "Sun, Jun 1"
 * for older entries.
 */
export function formatDoseRelative(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Full date + time, e.g. "Sunday, June 1, 2026 · 3:24 PM". */
export function formatDoseFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${formatTime(d)}`;
}

/** "0.5 mg" style amount label. */
export function formatDoseAmount(dose: Pick<DoseLog, "doseAmount" | "doseUnit">): string {
  return `${dose.doseAmount} ${dose.doseUnit}`;
}
