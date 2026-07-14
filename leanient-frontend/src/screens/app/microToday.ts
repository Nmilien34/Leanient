import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Per-day micro-action ticks (the defense-day walk, future micros): a local
 * map of action key → completion time, reset each calendar day. Device-only
 * by design — micros are rituals, never verdict inputs.
 */
const KEY = "leanient.microToday";

interface Stored {
  date: string;
  done: Record<string, string>; // action key → ISO timestamp
}

export async function loadMicroDone(now: Date): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const stored = JSON.parse(raw) as Stored;
    return stored.date === now.toDateString() ? stored.done : {};
  } catch {
    return {};
  }
}

export async function setMicroDone(now: Date, action: string, doneAt: string | null): Promise<Record<string, string>> {
  const done = await loadMicroDone(now);
  if (doneAt) done[action] = doneAt;
  else delete done[action];
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ date: now.toDateString(), done } satisfies Stored));
  } catch {
    // best-effort: resets tomorrow anyway
  }
  return done;
}
