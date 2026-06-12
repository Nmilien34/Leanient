import { describe, expect, it } from "vitest";
import {
  addItem,
  buildManualMealLogDraft,
  customItem,
  initialMealLogForm,
  itemFromPreset,
  removeItem,
  resetMacrosToEstimate,
} from "../../screens/app/mealLogForm";
import { FOOD_CATALOG, popularFoods, searchFoods } from "../../screens/app/foodCatalog";

const preset = (id: string) => {
  const found = FOOD_CATALOG.find((f) => f.id === id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found;
};

describe("searchFoods", () => {
  it("ranks name prefix over word prefix", () => {
    const names = searchFoods("chi", [], 20).map((f) => f.name);
    // Name-prefix matches (Chicken...) come before word-prefix (Grilled chicken breast).
    expect(names[0].toLowerCase().startsWith("chi")).toBe(true);
    expect(names).toContain("Grilled chicken breast");
    expect(names.indexOf("Grilled chicken breast")).toBeGreaterThan(names.indexOf("Chicken wrap"));
  });

  it("finds foods through keywords and excludes already-picked ids", () => {
    expect(searchFoods("hamburger").map((f) => f.id)).toContain("burger");
    expect(searchFoods("burger", ["burger", "breakfast_burrito", "burrito_bowl"]).map((f) => f.id)).not.toContain(
      "burger",
    );
  });

  it("returns nothing for a blank query and caps the result count", () => {
    expect(searchFoods("  ")).toEqual([]);
    expect(searchFoods("a").length).toBeLessThanOrEqual(6);
  });

  it("keeps the quick-pick list resolvable", () => {
    expect(popularFoods().length).toBe(10);
  });
});

describe("meal log form model", () => {
  it("sums macros from picked foods into the editable fields", () => {
    let form = addItem(initialMealLogForm, itemFromPreset(preset("greek_yogurt"))); // 20g / 130
    form = addItem(form, itemFromPreset(preset("protein_shake"))); // 25g / 150
    expect(form.protein).toBe("45");
    expect(form.calories).toBe("280");

    form = removeItem(form, "protein_shake");
    expect(form.protein).toBe("20");
    expect(form.calories).toBe("130");
  });

  it("stops rewriting macros once the user edits them, until reset", () => {
    let form = addItem(initialMealLogForm, itemFromPreset(preset("greek_yogurt")));
    form = { ...form, protein: "32", macrosEdited: true }; // user corrected the portion
    form = addItem(form, itemFromPreset(preset("protein_shake")));
    expect(form.protein).toBe("32"); // their number survives item changes

    form = resetMacrosToEstimate(form);
    expect(form.protein).toBe("45");
    expect(form.macrosEdited).toBe(false);
  });

  it("ignores duplicate picks", () => {
    let form = addItem(initialMealLogForm, itemFromPreset(preset("greek_yogurt")));
    form = addItem(form, itemFromPreset(preset("greek_yogurt")));
    expect(form.items).toHaveLength(1);
  });

  it("custom foods join as pills with zero macros for the user to fill in", () => {
    const form = addItem(initialMealLogForm, customItem("  Grandma's casserole "));
    expect(form.items[0]).toMatchObject({ name: "Grandma's casserole", isCustom: true, protein: 0 });
    expect(form.protein).toBe("0");
  });
});

describe("buildManualMealLogDraft", () => {
  it("combines picked foods into one log with summed macros, fiber, and water", () => {
    let form = addItem(initialMealLogForm, itemFromPreset(preset("oatmeal"))); // fiber 4, water 6
    form = addItem(form, itemFromPreset(preset("protein_shake"))); // water 10
    form = { ...form, notes: " quick breakfast " };

    expect(buildManualMealLogDraft(form, "2026-06-12T12:30:00.000Z")).toEqual({
      recordedAt: "2026-06-12T12:30:00.000Z",
      source: "manual",
      foodName: "Oatmeal + Protein shake",
      protein: 31,
      calories: 310,
      fiber: 4,
      waterOz: 16,
      notes: "quick breakfast",
    });
  });

  it("keeps a manual macro override in the saved log", () => {
    let form = addItem(initialMealLogForm, itemFromPreset(preset("greek_yogurt")));
    form = { ...form, protein: "32", macrosEdited: true };
    expect(buildManualMealLogDraft(form, "2026-06-12T12:30:00.000Z")).toMatchObject({
      foodName: "Greek yogurt",
      protein: 32,
    });
  });

  it("rejects an empty meal and non-numeric macros", () => {
    expect(() => buildManualMealLogDraft(initialMealLogForm, "2026-06-12T12:30:00.000Z")).toThrow(
      "Add at least one food",
    );

    const form = { ...addItem(initialMealLogForm, customItem("Mystery dish")), protein: "lots", macrosEdited: true };
    expect(() => buildManualMealLogDraft(form, "2026-06-12T12:30:00.000Z")).toThrow("Protein must be a number");
  });
});
