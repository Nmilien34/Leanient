import type { Workout, WorkoutEffort, WorkoutLog, WorkoutLogExercise } from "@leanient/shared";

/**
 * Shared formatting + lookups for the workout history list and detail views.
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
export function sortRecentWorkouts(logs: WorkoutLog[]): WorkoutLog[] {
  return [...logs]
    .filter((l) => !l.deletedAt)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

/** "Today" / "Yesterday" / "N days ago" for the past week, then "Sun, Jun 1". */
export function formatWorkoutDay(iso: string, now: Date): string {
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
export function formatWorkoutFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${formatTime(d)}`;
}

/** Resolve a display title: custom name, else the catalog workout's title, else generic. */
export function workoutTitle(log: WorkoutLog, workouts: Workout[]): string {
  if (log.customWorkoutName) return log.customWorkoutName;
  if (log.workoutId) {
    const match = workouts.find((w) => w.id === log.workoutId);
    if (match) return match.title;
  }
  return "Workout";
}

/** "5 exercises · 22 min" summary line. */
export function workoutSummaryLine(log: WorkoutLog): string {
  const count = log.exercises.length;
  const exercises = `${count} ${count === 1 ? "exercise" : "exercises"}`;
  return `${exercises} · ${log.durationMinutes} min`;
}

const EFFORT_LABEL: Record<WorkoutEffort, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export function effortLabel(effort: WorkoutEffort | undefined): string | null {
  return effort ? EFFORT_LABEL[effort] : null;
}

/** Per-exercise set summary, e.g. "12×20lb · 10×20lb · 8" (weight optional). */
export function exerciseSetsLine(exercise: WorkoutLogExercise): string {
  if (exercise.sets.length === 0) return "";
  return exercise.sets
    .map((s) => (s.weight != null ? `${s.reps}×${s.weight}${s.unit ?? ""}` : `${s.reps}`))
    .join(" · ");
}
