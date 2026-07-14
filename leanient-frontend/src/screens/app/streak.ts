import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The streak engine (frames 09-10): a day is won when the whole plan checks
 * off. Streaks bend, they don't break — one "steady pass" per rolling week
 * silently covers a missed day. Device-local v1 (like water/micros); the
 * verdict engine never reads it.
 */
const KEY = "leanient.streak";

export interface StreakStore {
  /** toDateString() keys of won days, newest last, capped. */
  wonDates: string[];
  longest: number;
}

export interface StreakRead {
  days: number;
  longest: number;
  /** True when the current chain has an unused pass in its last 7 days. */
  passAvailable: boolean;
}

const dayKey = (d: Date) => d.toDateString();

export async function loadStreakStore(): Promise<StreakStore> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { wonDates: [], longest: 0 };
    const parsed = JSON.parse(raw) as StreakStore;
    return { wonDates: parsed.wonDates ?? [], longest: parsed.longest ?? 0 };
  } catch {
    return { wonDates: [], longest: 0 };
  }
}

export async function recordDayWon(store: StreakStore, now: Date): Promise<StreakStore> {
  const key = dayKey(now);
  if (store.wonDates.includes(key)) return store;
  const wonDates = [...store.wonDates, key].slice(-90);
  const days = computeStreak({ wonDates, longest: store.longest }, now).days;
  const next: StreakStore = { wonDates, longest: Math.max(store.longest, days) };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}

/**
 * Walk back from today: won days extend the chain, one missed day per
 * rolling 7 is covered by the steady pass (it keeps the chain, adds no day),
 * a second miss inside the window ends it. An unfinished today never breaks
 * the chain.
 */
export function computeStreak(store: StreakStore, now: Date): StreakRead {
  const won = new Set(store.wonDates);
  const cursor = new Date(now);
  let days = 0;
  let walked = 0;
  let lastPassAt = Number.NEGATIVE_INFINITY;

  for (;;) {
    const key = dayKey(cursor);
    if (won.has(key)) {
      days += 1;
    } else if (walked === 0) {
      // today, still open — neither counts nor consumes anything
    } else if (walked - lastPassAt > 6) {
      // The pass only bridges toward another won day; a trailing miss just
      // ends the walk without spending it.
      const peek = new Date(cursor);
      peek.setDate(peek.getDate() - 1);
      if (!won.has(dayKey(peek))) break;
      lastPassAt = walked;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
    walked += 1;
    if (walked > 400) break;
  }

  return {
    days,
    longest: Math.max(store.longest, days),
    passAvailable: lastPassAt < walked - 7,
  };
}

/** The medal ladder: the next milestone ahead of the current streak. */
export function nextBadge(days: number): { name: string; remaining: number } | null {
  const LADDER: Array<[number, string]> = [
    [3, "Three day run"],
    [7, "One steady week"],
    [14, "Two steady weeks"],
    [30, "A steady month"],
    [60, "Two steady months"],
  ];
  for (const [at, name] of LADDER) {
    if (days < at) return { name, remaining: at - days };
  }
  return null;
}
