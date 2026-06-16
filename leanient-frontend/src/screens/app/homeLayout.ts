/**
 * FRONTEND-ONLY resolver for the dynamic Today-scope ordering. Instead of a fixed
 * "score → verdict → plan", the order matches the user's actual situation, keyed
 * off what the engine is confident in rather than the raw score:
 *
 *   lapsed   → re-engage first; the stale score/verdict would mislead
 *   shot-day → lead with the contextual guidance (a dip here is expected)
 *   drifting → an *unexplained* drop; lead with the why + the fix
 *   thriving → lead with the score, let them feel the win
 *   steady   → default score → verdict → plan
 *
 * New users (no score yet) are handled by the cold-start cards, so this returns
 * null for them. First match wins.
 */

export type HomeState = "lapsed" | "shot_day" | "drifting" | "thriving" | "steady";
export type HomeSection = "score" | "verdict" | "plan";

export interface HomeBanner {
  tone: "reengage";
  title: string;
  message: string;
}

export interface HomeLayout {
  state: HomeState;
  /** The reorderable hero trio, hero first. */
  order: HomeSection[];
  banner: HomeBanner | null;
}

/** No activity for this many days reads as lapsed (stale score). */
export const LAPSED_DAYS = 5;
/** A week-over-week retention drop this steep (when not shot-explained) is real drift. */
export const DRIFT_DELTA = -15;

/** Whole days since the most recent of a set of ISO timestamps, or null if none. */
export function daysSinceLatest(isoDates: Array<string | null | undefined>, now: Date): number | null {
  const times = isoDates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  return Math.max(0, Math.floor((now.getTime() - Math.max(...times)) / 86_400_000));
}

export function resolveHomeLayout(args: {
  /** True once the engine has a retention score; false routes to cold-start. */
  hasScore: boolean;
  /** Week-over-week retention change; null with one week of data. */
  retentionDelta: number | null;
  /** Days since the user last logged anything; null if never. */
  daysSinceLastActivity: number | null;
  /** True in the shot's ease-in window (energy below "good"), where a dip is expected. */
  shotContext: boolean;
}): HomeLayout | null {
  if (!args.hasScore) return null;
  const { retentionDelta, daysSinceLastActivity, shotContext } = args;

  // 1 · Lapsed — the score is stale, so don't lead with it. Get them logging.
  if (daysSinceLastActivity != null && daysSinceLastActivity >= LAPSED_DAYS) {
    return {
      state: "lapsed",
      order: ["plan", "verdict", "score"],
      banner: {
        tone: "reengage",
        title: "Welcome back",
        message: `It's been ${daysSinceLastActivity} days. Log today and your muscle score refreshes.`,
      },
    };
  }

  // 2 · Shot-day / ease-in — the day's behavior changes; lead with the guidance.
  // This outranks drift on purpose: a dip in this window is expected, not alarming.
  if (shotContext) {
    return { state: "shot_day", order: ["verdict", "plan", "score"], banner: null };
  }

  // 3 · Drifting unexpectedly — a real drop with no shot-day explanation. Course-correct.
  if (retentionDelta != null && retentionDelta <= DRIFT_DELTA) {
    return { state: "drifting", order: ["verdict", "plan", "score"], banner: null };
  }

  // 4 · Thriving — stable or improving. Lead with the score, let them feel the win.
  if (retentionDelta != null && retentionDelta >= 0) {
    return { state: "thriving", order: ["score", "verdict", "plan"], banner: null };
  }

  // 5 · Steady default — a soft dip, nothing special. Score → verdict → plan.
  return { state: "steady", order: ["score", "verdict", "plan"], banner: null };
}
