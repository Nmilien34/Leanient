/**
 * Tracks workout sessions that were STARTED, so the journey can say "you
 * started but didn't finish" instead of pretending nothing happened. A start
 * is recorded when the player opens; elapsed minutes update when it closes
 * without a completion; a completion marks the entry done (the workout log is
 * still the source of truth for finished sessions).
 *
 * Device-local by design: an abandoned session is a nudge, not a record the
 * backend needs. Pure map logic lives here (testable); AsyncStorage IO is the
 * thin layer at the bottom.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SessionStart {
  /** Local YYYY-MM-DD of the day the session was started. */
  dateKey: string;
  workoutTitle: string;
  startedAt: string; // ISO
  /** Seconds spent in the player before it closed (best effort). */
  elapsedSeconds: number;
  /** True once the session was actually completed (a workout log exists). */
  completed: boolean;
}

export type SessionStartMap = Record<string, SessionStart>;

export const SESSION_STARTS_KEY = "leanient.sessionStarts.v1";
/** Entries older than this are pruned on write; the day review reads 7. */
export const KEEP_DAYS = 14;

/** Local YYYY-MM-DD key, matching the consistency helper's day bucketing. */
export function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/** Record a fresh start for today. A restart keeps the larger elapsed time. */
export function withSessionStart(map: SessionStartMap, workoutTitle: string, now: Date): SessionStartMap {
  const key = dayKeyOf(now);
  const existing = map[key];
  return pruneOldStarts(
    {
      ...map,
      [key]: {
        dateKey: key,
        workoutTitle,
        startedAt: existing?.startedAt ?? now.toISOString(),
        elapsedSeconds: existing?.elapsedSeconds ?? 0,
        completed: existing?.completed ?? false,
      },
    },
    now,
  );
}

/** Fold in elapsed time from a player that closed without completing. */
export function withSessionProgress(map: SessionStartMap, elapsedSeconds: number, now: Date): SessionStartMap {
  const key = dayKeyOf(now);
  const existing = map[key];
  if (!existing) return map;
  return { ...map, [key]: { ...existing, elapsedSeconds: Math.max(existing.elapsedSeconds, Math.round(elapsedSeconds)) } };
}

/** Mark today's start completed (called alongside the workout log save). */
export function withSessionCompleted(map: SessionStartMap, elapsedSeconds: number, now: Date): SessionStartMap {
  const key = dayKeyOf(now);
  const existing = map[key];
  const base: SessionStart = existing ?? {
    dateKey: key,
    workoutTitle: "Session",
    startedAt: now.toISOString(),
    elapsedSeconds: 0,
    completed: false,
  };
  return { ...map, [key]: { ...base, completed: true, elapsedSeconds: Math.max(base.elapsedSeconds, Math.round(elapsedSeconds)) } };
}

/** Drop entries older than KEEP_DAYS so the map never grows unbounded. */
export function pruneOldStarts(map: SessionStartMap, now: Date): SessionStartMap {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - KEEP_DAYS);
  const pruned: SessionStartMap = {};
  for (const [key, value] of Object.entries(map)) {
    const parsed = new Date(`${key}T00:00:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed >= cutoff) pruned[key] = value;
  }
  return pruned;
}

/** Today's abandoned start, or null when nothing was started or it finished. */
export function unfinishedStartFor(map: SessionStartMap, now: Date): SessionStart | null {
  const entry = map[dayKeyOf(now)];
  return entry && !entry.completed ? entry : null;
}

/* ---------------- AsyncStorage IO (thin) ---------------- */

export async function loadSessionStarts(): Promise<SessionStartMap> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STARTS_KEY);
    return raw ? (JSON.parse(raw) as SessionStartMap) : {};
  } catch {
    return {};
  }
}

async function save(map: SessionStartMap): Promise<SessionStartMap> {
  try {
    await AsyncStorage.setItem(SESSION_STARTS_KEY, JSON.stringify(map));
  } catch {
    // Best-effort: an unsaved nudge is not worth surfacing an error for.
  }
  return map;
}

export async function recordSessionStart(workoutTitle: string, now = new Date()): Promise<SessionStartMap> {
  return save(withSessionStart(await loadSessionStarts(), workoutTitle, now));
}

export async function recordSessionProgress(elapsedSeconds: number, now = new Date()): Promise<SessionStartMap> {
  return save(withSessionProgress(await loadSessionStarts(), elapsedSeconds, now));
}

export async function recordSessionCompleted(elapsedSeconds: number, now = new Date()): Promise<SessionStartMap> {
  return save(withSessionCompleted(await loadSessionStarts(), elapsedSeconds, now));
}
