import { describe, expect, it } from "vitest";
import { buildPlanChecklist, type TodayPlan } from "../../screens/app/todayPlanMetrics";

function planWith(overrides: Partial<TodayPlan> & { eat?: Partial<TodayPlan["eat"]> }): TodayPlan {
  const eat: TodayPlan["eat"] = {
    logged: 0,
    target: 140,
    remaining: 140,
    ratio: 0,
    pct: 0,
    subline: "",
    suggestions: [{ name: "Protein shake", protein: 30, calories: 160 }],
    ...overrides.eat,
  };
  return {
    subtitle: "Tuesday · Day 44 · 3 days after your shot",
    move: { title: "Upper body · dumbbells", duration: "22 min", tags: [], subline: "Chest, back, arms." },
    steady: null,
    daysSinceShot: 3,
    focus: null,
    coachLine: "",
    payoff: "",
    ...overrides,
    eat,
  };
}

describe("buildPlanChecklist", () => {
  it("splits protein into a banked done step and one next bite", () => {
    const items = buildPlanChecklist({
      plan: planWith({ eat: { logged: 42, remaining: 98, pct: 30 } }),
      mealsLoggedToday: 1,
      eatDone: false,
      moveDone: false,
      doseLoggedToday: false,
    });
    expect(items.map((i) => i.key)).toEqual(["protein-banked", "protein-next", "session"]);
    expect(items[0].done).toBe(true);
    expect(items[0].title).toBe("Protein so far · 42g");
    expect(items[0].sub).toBe("One meal logged. 98g to go.");
    expect(items[1].title).toContain("Next protein meal");
    expect(items[1].trailingPct).toBe(30);
    expect(items[1].expandsEat).toBe(true);
  });

  it("reads back the last logged meal by name with the remaining gap", () => {
    const items = buildPlanChecklist({
      plan: planWith({ eat: { logged: 10, remaining: 40, pct: 20 } }),
      mealsLoggedToday: 1,
      lastMealName: "Greek yogurt",
      eatDone: false,
      moveDone: false,
      doseLoggedToday: false,
    });
    expect(items[0].sub).toBe("Greek yogurt logged. 40g to go.");
  });

  it("names a started-but-unfinished session with its minutes", () => {
    const items = buildPlanChecklist({
      plan: planWith({}),
      mealsLoggedToday: 0,
      eatDone: false,
      moveDone: false,
      sessionStart: { elapsedSeconds: 470 },
      doseLoggedToday: false,
    });
    const session = items.find((i) => i.kind === "session")!;
    expect(session.done).toBe(false);
    expect(session.sub).toBe("Started, 8 min in. Pick it back up.");
  });

  it("ignores the abandoned start once the session is actually done", () => {
    const items = buildPlanChecklist({
      plan: planWith({}),
      mealsLoggedToday: 0,
      eatDone: false,
      moveDone: true,
      sessionStart: { elapsedSeconds: 470 },
      doseLoggedToday: false,
    });
    const session = items.find((i) => i.kind === "session")!;
    expect(session.done).toBe(true);
    expect(session.sub).not.toContain("Started");
  });

  it("asks for one meal-sized bite, never the whole remaining mountain", () => {
    const items = buildPlanChecklist({
      plan: planWith({ eat: { logged: 0, remaining: 140 } }),
      mealsLoggedToday: 0,
      eatDone: false,
      moveDone: false,
      doseLoggedToday: false,
    });
    const next = items.find((i) => i.key === "protein-next")!;
    const grams = Number(next.title.match(/~(\d+)g/)?.[1]);
    expect(next.title).toContain("Protein meal one");
    expect(grams).toBeLessThanOrEqual(45);
    expect(grams).toBeGreaterThanOrEqual(20);
  });

  it("collapses to one done protein row once the target is hit", () => {
    const items = buildPlanChecklist({
      plan: planWith({ eat: { logged: 141, remaining: 0, pct: 100 } }),
      mealsLoggedToday: 3,
      eatDone: true,
      moveDone: true,
      doseLoggedToday: false,
    });
    expect(items.filter((i) => i.kind === "protein")).toHaveLength(1);
    expect(items[0].done).toBe(true);
    expect(items[1].kind).toBe("session");
    expect(items[1].done).toBe(true);
  });

  it("adds the shot step only on shot day, checked once the dose is logged", () => {
    const shotDay = buildPlanChecklist({
      plan: planWith({ daysSinceShot: 0 }),
      mealsLoggedToday: 0,
      eatDone: false,
      moveDone: false,
      doseLoggedToday: true,
    });
    expect(shotDay.find((i) => i.kind === "shot")).toMatchObject({ title: "Log your shot", done: true });

    const midCycle = buildPlanChecklist({
      plan: planWith({ daysSinceShot: 3 }),
      mealsLoggedToday: 0,
      eatDone: false,
      moveDone: false,
      doseLoggedToday: false,
    });
    expect(midCycle.find((i) => i.kind === "shot")).toBeUndefined();
  });

  it("marks the day's leaking lever as the focus step", () => {
    const items = buildPlanChecklist({
      plan: planWith({ focus: "training", eat: { logged: 42, remaining: 98 } }),
      mealsLoggedToday: 1,
      eatDone: false,
      moveDone: false,
      doseLoggedToday: false,
    });
    expect(items.find((i) => i.kind === "session")!.focus).toBe(true);
    expect(items.find((i) => i.key === "protein-next")!.focus).toBe(false);
  });
});
