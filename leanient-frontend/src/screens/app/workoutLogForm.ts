import type { WorkoutEffort, WorkoutLog } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Workout screen (35). A manual workout log has
 * no exercises, so the form captures type + duration + effort, and whether it
 * counts as a resistance session (the signal the verdict engine credits).
 * `buildWorkoutLogDraft` produces the payload that maps to the shared
 * `WorkoutLog` contract, so what gets saved is traceable and testable.
 */

export type WorkoutType = "resistance" | "cardio" | "walk" | "class" | "other";

export const WORKOUT_TYPES: { id: WorkoutType; label: string }[] = [
  { id: "resistance", label: "Resistance" },
  { id: "cardio", label: "Cardio" },
  { id: "walk", label: "Walk" },
  { id: "class", label: "Class" },
  { id: "other", label: "Other" },
];

export const DURATION_OPTIONS = [15, 22, 30, 45, 60]; // minutes

// "normal" is the contract value; the UI labels it "Moderate".
export const EFFORT_OPTIONS: { id: WorkoutEffort; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Moderate" },
  { id: "hard", label: "Hard" },
];

const TYPE_LABEL: Record<WorkoutType, string> = Object.fromEntries(WORKOUT_TYPES.map((t) => [t.id, t.label])) as Record<
  WorkoutType,
  string
>;

/** Only resistance training protects muscle on a GLP-1, so it's the default credit. */
export function defaultCountsAsResistance(type: WorkoutType): boolean {
  return type === "resistance";
}

export interface WorkoutLogForm {
  type: WorkoutType;
  durationMinutes: number;
  effort: WorkoutEffort;
  countsAsResistance: boolean;
}

export const initialWorkoutLogForm: WorkoutLogForm = {
  type: "resistance",
  durationMinutes: 22,
  effort: "normal",
  countsAsResistance: true,
};

export interface WorkoutLogDraft {
  customWorkoutName: string;
  durationMinutes: number;
  perceivedEffort: WorkoutEffort;
  exercises: [];
  /** Whether this session counts toward the weekly resistance target (verdict). */
  countsAsResistance: boolean;
  recordedAt: string;
}

/** Map the form to the savable draft (maps onto the shared `WorkoutLog`). */
export function buildWorkoutLogDraft(form: WorkoutLogForm, recordedAt: string): WorkoutLogDraft {
  return {
    customWorkoutName: TYPE_LABEL[form.type],
    durationMinutes: form.durationMinutes,
    perceivedEffort: form.effort,
    exercises: [],
    countsAsResistance: form.countsAsResistance,
    recordedAt,
  };
}

const EFFORT_LABEL: Record<WorkoutEffort, string> = { easy: "Easy", normal: "Moderate", hard: "Hard" };
const TYPE_FROM_LABEL = Object.fromEntries(WORKOUT_TYPES.map((t) => [t.label, t.id])) as Record<string, WorkoutType>;

export interface RecentWorkoutPick {
  key: string;
  /** Display name (the logged name, or the type label). */
  label: string;
  /** "30 min · Moderate". */
  detail: string;
  /** "Today" / "2 days ago" / "3 wks ago". */
  when: string;
  /** Tapping it pre-fills the form with these values. */
  form: WorkoutLogForm;
}

function relativeDay(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? "1 wk ago" : `${weeks} wks ago`;
}

/**
 * The user's recent workouts, deduped by type + duration, newest first — a quick
 * pick list so a forgotten session is one tap to re-log instead of re-entering
 * every field. Each pick maps back to a pre-fillable form.
 */
export function buildRecentWorkoutPicks(logs: WorkoutLog[], now: Date, limit = 4): RecentWorkoutPick[] {
  const sorted = [...logs].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1)); // newest first
  const out: RecentWorkoutPick[] = [];
  const seen = new Set<string>();
  for (const log of sorted) {
    const type: WorkoutType =
      (log.customWorkoutName ? TYPE_FROM_LABEL[log.customWorkoutName] : undefined) ??
      (log.countsAsResistance ? "resistance" : "other");
    const dedupeKey = `${type}-${log.durationMinutes}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const effort: WorkoutEffort = log.perceivedEffort ?? "normal";
    out.push({
      key: log.id,
      label: log.customWorkoutName?.trim() || TYPE_LABEL[type],
      detail: `${log.durationMinutes} min · ${EFFORT_LABEL[effort]}`,
      when: relativeDay(log.recordedAt, now),
      form: { type, durationMinutes: log.durationMinutes, effort, countsAsResistance: log.countsAsResistance },
    });
    if (out.length >= limit) break;
  }
  return out;
}
