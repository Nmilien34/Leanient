import type { CreateMealLogRequest } from "@leanient/shared";

export interface MealLogForm {
  foodName: string;
  protein: string;
  calories: string;
  notes: string;
}

export const initialMealLogForm: MealLogForm = {
  foodName: "",
  protein: "",
  calories: "",
  notes: "",
};

function parseNonnegativeNumber(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a number`);
  }
  return parsed;
}

export function buildManualMealLogDraft(
  form: MealLogForm,
  recordedAt: string,
): CreateMealLogRequest {
  const foodName = form.foodName.trim();
  if (!foodName) {
    throw new Error("Food name is required");
  }

  const notes = form.notes.trim();

  return {
    recordedAt,
    source: "manual",
    foodName,
    protein: parseNonnegativeNumber(form.protein, "Protein"),
    calories: parseNonnegativeNumber(form.calories, "Calories"),
    ...(notes ? { notes } : {}),
  };
}
