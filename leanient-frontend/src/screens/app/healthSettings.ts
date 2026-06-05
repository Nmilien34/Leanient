/**
 * FRONTEND config for the Apple Health screen (29). HealthKit connection +
 * per-type sync are device-side (HealthKit permissions), not a backend
 * contract, so the toggle state is local. The one derived value is the relative
 * "last synced" label, computed from a timestamp.
 */

export type HealthIcon = "weight" | "workouts" | "steps" | "energy" | "bodyfat";

export interface HealthDataType {
  id: string;
  icon: HealthIcon;
  label: string;
  defaultOn: boolean;
}

export const HEALTH_DATA_TYPES: HealthDataType[] = [
  { id: "weight", icon: "weight", label: "Weight", defaultOn: true },
  { id: "workouts", icon: "workouts", label: "Workouts", defaultOn: true },
  { id: "steps", icon: "steps", label: "Steps", defaultOn: true },
  { id: "active_energy", icon: "energy", label: "Active energy", defaultOn: false },
  { id: "body_fat", icon: "bodyfat", label: "Body fat %", defaultOn: false },
];

export function defaultHealthSyncState(): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const t of HEALTH_DATA_TYPES) state[t.id] = t.defaultOn;
  return state;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** Human "last synced …" phrase from a timestamp (e.g. "2 minutes ago"). */
export function relativeSyncLabel(lastSyncedAt: string, now: Date): string {
  const last = new Date(lastSyncedAt);
  if (Number.isNaN(last.getTime())) return "not yet";
  const sec = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${plural(min, "minute")} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${plural(hr, "hour")} ago`;
  const days = Math.round(hr / 24);
  return `${plural(days, "day")} ago`;
}
