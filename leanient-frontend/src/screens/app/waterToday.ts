import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Shot-day water: a local tap counter (0.5L per tap toward 2L) keyed to the
 * calendar day. Device-only by design — hydration is a reset-day ritual, not
 * a tracked metric, so it never touches the backend or the verdict.
 */
const KEY = "leanient.waterToday";

interface Stored {
  date: string;
  liters: number;
}

export async function loadWaterToday(now: Date): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return 0;
    const stored = JSON.parse(raw) as Stored;
    return stored.date === now.toDateString() ? stored.liters : 0;
  } catch {
    return 0;
  }
}

export async function saveWaterToday(now: Date, liters: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ date: now.toDateString(), liters } satisfies Stored));
  } catch {
    // best-effort: the counter resets tomorrow anyway
  }
}
