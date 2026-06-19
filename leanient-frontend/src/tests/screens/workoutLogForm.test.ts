import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@leanient/shared";
import {
  buildRecentWorkoutPicks,
  buildWorkoutLogDraft,
  defaultCountsAsResistance,
  initialWorkoutLogForm,
} from "../../screens/app/workoutLogForm";

const DAY = 86_400_000;
const now = new Date("2026-06-19T12:00:00.000Z");

function wlog(daysAgo: number, over: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: `w-${daysAgo}-${over.customWorkoutName ?? "x"}-${over.durationMinutes ?? 30}`,
    userId: "u",
    recordedAt: new Date(now.getTime() - daysAgo * DAY).toISOString(),
    customWorkoutName: "Resistance",
    exercises: [],
    durationMinutes: 30,
    countsAsResistance: true,
    perceivedEffort: "normal",
    createdAt: "",
    updatedAt: "",
    ...over,
  } as WorkoutLog;
}

describe("workoutLogForm", () => {
  it("counts only resistance as a resistance session by default", () => {
    expect(defaultCountsAsResistance("resistance")).toBe(true);
    expect(defaultCountsAsResistance("cardio")).toBe(false);
    expect(defaultCountsAsResistance("walk")).toBe(false);
    expect(defaultCountsAsResistance("class")).toBe(false);
  });

  it("maps the form to a WorkoutLog draft", () => {
    const draft = buildWorkoutLogDraft(initialWorkoutLogForm, "2026-06-03T18:00:00.000Z");
    expect(draft).toEqual({
      customWorkoutName: "Resistance",
      durationMinutes: 22,
      perceivedEffort: "normal",
      exercises: [],
      countsAsResistance: true,
      recordedAt: "2026-06-03T18:00:00.000Z",
    });
  });

  it("carries the chosen type, duration, effort, and resistance flag through", () => {
    const draft = buildWorkoutLogDraft(
      { type: "cardio", durationMinutes: 45, effort: "hard", countsAsResistance: false },
      "2026-06-03T18:00:00.000Z",
    );
    expect(draft.customWorkoutName).toBe("Cardio");
    expect(draft.durationMinutes).toBe(45);
    expect(draft.perceivedEffort).toBe("hard");
    expect(draft.countsAsResistance).toBe(false);
  });
});

describe("buildRecentWorkoutPicks", () => {
  it("returns nothing with no history", () => {
    expect(buildRecentWorkoutPicks([], now)).toEqual([]);
  });

  it("lists newest first and dedupes by type + duration", () => {
    const picks = buildRecentWorkoutPicks(
      [
        wlog(10, { customWorkoutName: "Resistance", durationMinutes: 30 }),
        wlog(1, { customWorkoutName: "Resistance", durationMinutes: 30 }),
        wlog(3, { customWorkoutName: "Cardio", durationMinutes: 45, countsAsResistance: false }),
      ],
      now,
    );
    expect(picks.map((p) => p.label)).toEqual(["Resistance", "Cardio"]);
    expect(picks[0].when).toBe("Yesterday");
    expect(picks[0].detail).toBe("30 min · Moderate");
  });

  it("reconstructs the form from a logged pick", () => {
    const [pick] = buildRecentWorkoutPicks(
      [wlog(2, { customWorkoutName: "Walk", durationMinutes: 22, countsAsResistance: false, perceivedEffort: "easy" })],
      now,
    );
    expect(pick.form).toEqual({ type: "walk", durationMinutes: 22, effort: "easy", countsAsResistance: false });
  });

  it("keeps a guided workout's real name but falls back to a sensible form type", () => {
    const [pick] = buildRecentWorkoutPicks([wlog(2, { customWorkoutName: "Full-body strength", countsAsResistance: true })], now);
    expect(pick.label).toBe("Full-body strength");
    expect(pick.form.type).toBe("resistance");
  });

  it("caps the list at the limit", () => {
    const logs = [0, 1, 2, 3, 4, 5].map((d) => wlog(d, { durationMinutes: 15 + d }));
    expect(buildRecentWorkoutPicks(logs, now, 4)).toHaveLength(4);
  });
});
