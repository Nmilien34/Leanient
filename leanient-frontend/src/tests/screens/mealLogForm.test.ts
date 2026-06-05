import { describe, expect, it } from "vitest";
import { buildManualMealLogDraft, initialMealLogForm } from "../../screens/app/mealLogForm";

describe("mealLogForm", () => {
  it("maps the manual meal form to a savable MealLog draft", () => {
    expect(
      buildManualMealLogDraft(
        {
          ...initialMealLogForm,
          foodName: "Greek yogurt",
          protein: "28",
          calories: "210",
          notes: "Protein powder mixed in",
        },
        "2026-06-03T12:30:00.000Z",
      ),
    ).toEqual({
      recordedAt: "2026-06-03T12:30:00.000Z",
      source: "manual",
      foodName: "Greek yogurt",
      protein: 28,
      calories: 210,
      notes: "Protein powder mixed in",
    });
  });

  it("trims optional notes and omits empty notes", () => {
    const draft = buildManualMealLogDraft(
      {
        ...initialMealLogForm,
        foodName: "Chicken bowl",
        protein: "42.5",
        calories: "520",
        notes: "  ",
      },
      "2026-06-03T12:30:00.000Z",
    );

    expect(draft).toMatchObject({
      foodName: "Chicken bowl",
      protein: 42.5,
      calories: 520,
    });
    expect(draft.notes).toBeUndefined();
  });

  it("rejects incomplete manual meal entries before save", () => {
    expect(() =>
      buildManualMealLogDraft(
        {
          ...initialMealLogForm,
          foodName: "",
          protein: "20",
          calories: "150",
        },
        "2026-06-03T12:30:00.000Z",
      ),
    ).toThrow("Food name is required");
    expect(() =>
      buildManualMealLogDraft(
        {
          ...initialMealLogForm,
          foodName: "Greek yogurt",
          protein: "not a number",
          calories: "150",
        },
        "2026-06-03T12:30:00.000Z",
      ),
    ).toThrow("Protein must be a number");
  });
});
