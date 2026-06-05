import { describe, expect, it } from "vitest";
import {
  buildWorkoutLogDraft,
  defaultCountsAsResistance,
  initialWorkoutLogForm,
} from "../../screens/app/workoutLogForm";

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
