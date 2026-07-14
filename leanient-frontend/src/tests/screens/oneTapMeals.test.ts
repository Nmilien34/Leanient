import { describe, expect, it } from "vitest";
import { buildOneTapMeals } from "../../screens/app/oneTapMeals";

const NOW = new Date("2026-07-16T12:00:00"); // Thursday

const meal = (foodName: string, protein: number, daysAgo: number, calories = 300) => ({
  foodName,
  protein,
  calories,
  recordedAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
});

const FALLBACK = [
  { name: "Protein shake", protein: 30, calories: 160 },
  { name: "Greek yogurt + berries", protein: 20, calories: 180 },
  { name: "Salmon + greens", protein: 35, calories: 400 },
];

describe("buildOneTapMeals", () => {
  it("ranks their own meals by frequency then protein, with honest notes", () => {
    const rows = buildOneTapMeals({
      recentMeals: [
        meal("Chicken bowl", 42, 2),
        meal("chicken bowl", 40, 4),
        meal("Cottage cheese", 24, 1),
        meal("Tuna wrap", 28, 3),
      ],
      fallback: FALLBACK,
      now: NOW,
    });
    expect(rows.map((r) => r.name)).toEqual(["Chicken bowl", "Tuna wrap", "Cottage cheese"]);
    expect(rows[0].note).toBe("2× this week");
    expect(rows[0].protein).toBe(42); // most recent macros win
    expect(rows[1].note).toBe("you logged it Monday");
    expect(rows[2].note).toBe("you logged it yesterday");
    expect(rows.every((r) => r.fromHistory)).toBe(true);
  });

  it("tops up from the generic ideas when history is thin", () => {
    const rows = buildOneTapMeals({
      recentMeals: [meal("Protein shake", 30, 1)],
      fallback: FALLBACK,
      now: NOW,
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Protein shake", fromHistory: true });
    // fallback skips the name already covered by history
    expect(rows.slice(1).map((r) => r.name)).toEqual(["Greek yogurt + berries", "Salmon + greens"]);
    expect(rows[1].note).toBe("a solid pick");
  });

  it("ignores zero-protein and unnamed logs", () => {
    const rows = buildOneTapMeals({
      recentMeals: [meal("", 40, 1), meal("Black coffee", 0, 1)],
      fallback: FALLBACK,
      now: NOW,
    });
    expect(rows.every((r) => !r.fromHistory)).toBe(true);
  });
});
