import { describe, expect, it } from "vitest";
import { computeStreak, nextBadge, type StreakStore } from "../../screens/app/streak";

const NOW = new Date("2026-07-13T20:00:00");

const daysAgo = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toDateString();
};

const store = (won: number[], longest = 0): StreakStore => ({
  wonDates: won.map(daysAgo),
  longest,
});

describe("computeStreak", () => {
  it("counts consecutive won days ending today", () => {
    const read = computeStreak(store([0, 1, 2, 3]), NOW);
    expect(read.days).toBe(4);
    expect(read.passAvailable).toBe(true);
  });

  it("an unfinished today never breaks the chain", () => {
    const read = computeStreak(store([1, 2, 3]), NOW);
    expect(read.days).toBe(3);
  });

  it("the steady pass covers one miss per rolling week", () => {
    // won today+yesterday, missed 2 days ago, won 3-5 days ago
    const read = computeStreak(store([0, 1, 3, 4, 5]), NOW);
    expect(read.days).toBe(5);
    expect(read.passAvailable).toBe(false); // pass just spent inside the window
  });

  it("a second miss inside the window ends the chain", () => {
    const read = computeStreak(store([0, 1, 3, 5, 6]), NOW);
    expect(read.days).toBe(3); // today, yesterday, +covered miss, day3 — second gap at day4? walk: 0✓1✓2 pass 3✓4 break
  });

  it("keeps the stored longest when the current chain is shorter", () => {
    const read = computeStreak(store([0, 1], 12), NOW);
    expect(read.days).toBe(2);
    expect(read.longest).toBe(12);
  });
});

describe("nextBadge", () => {
  it("names the next milestone with the remaining days", () => {
    expect(nextBadge(1)).toEqual({ name: "Three day run", remaining: 2 });
    expect(nextBadge(12)).toEqual({ name: "Two steady weeks", remaining: 2 });
    expect(nextBadge(30)).toEqual({ name: "Two steady months", remaining: 30 });
    expect(nextBadge(90)).toBeNull();
  });
});
