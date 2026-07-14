import type { EatSuggestion } from "./todayPlanMetrics";

/**
 * The one-tap log sheet's rows (design/home-coach.html frame 05): the user's
 * OWN recent meals first — named, with an honest history note — topped up
 * from the generic suggestion list when history is thin. One tap re-logs the
 * meal as it was last eaten.
 */
export interface OneTapMeal {
  name: string;
  protein: number;
  calories: number;
  /** "2× this week" / "you logged it Tuesday" / "a solid pick". */
  note: string;
  fromHistory: boolean;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function historyNote(count: number, latest: Date, now: Date): string {
  if (count >= 2) return `${count}× this week`;
  const days = Math.round((now.setHours(0, 0, 0, 0), now.getTime() - new Date(latest).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return "you logged it today";
  if (days === 1) return "you logged it yesterday";
  return `you logged it ${WEEKDAYS[latest.getDay()]}`;
}

export function buildOneTapMeals(args: {
  recentMeals: Array<{ foodName: string; protein: number; calories: number; recordedAt: string }>;
  /** The plan's generic ideas, used to top the list up to three. */
  fallback: EatSuggestion[];
  now: Date;
  limit?: number;
}): OneTapMeal[] {
  const { recentMeals, fallback, now, limit = 3 } = args;

  // Group their history by dish, keeping the most recent macros as "the meal".
  const byName = new Map<string, { name: string; protein: number; calories: number; count: number; latest: Date }>();
  for (const meal of recentMeals) {
    const at = new Date(meal.recordedAt);
    if (Number.isNaN(at.getTime()) || !meal.foodName?.trim() || meal.protein <= 0) continue;
    const key = meal.foodName.trim().toLowerCase();
    const entry = byName.get(key);
    if (!entry) {
      byName.set(key, { name: meal.foodName.trim(), protein: meal.protein, calories: meal.calories, count: 1, latest: at });
    } else {
      entry.count += 1;
      if (at > entry.latest) {
        entry.latest = at;
        entry.protein = meal.protein;
        entry.calories = meal.calories;
        entry.name = meal.foodName.trim();
      }
    }
  }

  const own = [...byName.values()]
    .sort((a, b) => b.count - a.count || b.protein - a.protein)
    .slice(0, limit)
    .map((m): OneTapMeal => ({
      name: m.name,
      protein: Math.round(m.protein),
      calories: Math.round(m.calories),
      note: historyNote(m.count, m.latest, new Date(now)),
      fromHistory: true,
    }));

  const used = new Set(own.map((m) => m.name.toLowerCase()));
  for (const idea of fallback) {
    if (own.length >= limit) break;
    if (used.has(idea.name.toLowerCase())) continue;
    used.add(idea.name.toLowerCase());
    own.push({ name: idea.name, protein: idea.protein, calories: idea.calories, note: "a solid pick", fromHistory: false });
  }
  return own;
}
