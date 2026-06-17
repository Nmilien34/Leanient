import type { CreateMealLogRequest, MealLog } from "@leanient/shared";
import type { FoodPreset } from "./foodCatalog";

/** A past meal offered for one-tap re-logging in the hub. */
export interface RecentMealPick {
  name: string;
  protein: number;
  calories: number;
}

/** Most-recent distinct logged meals (by name) for the "Recently logged" list. */
export function recentMealPicks(
  logs: Pick<MealLog, "foodName" | "protein" | "calories" | "recordedAt">[],
  limit = 6,
): RecentMealPick[] {
  const sorted = [...logs].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  const seen = new Set<string>();
  const out: RecentMealPick[] = [];
  for (const log of sorted) {
    const key = log.foodName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: log.foodName.trim(), protein: Math.round(log.protein), calories: Math.round(log.calories) });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * One food in the meal being logged. Preset items carry the catalog's typical
 * macros; custom items (typed by the user) carry none, so the user fills the
 * totals in themselves.
 */
export interface MealItem {
  /** Preset id, or `custom:<name>` for typed entries. */
  key: string;
  name: string;
  protein: number;
  calories: number;
  fiber?: number;
  waterOz?: number;
  isCustom: boolean;
}

export interface MealLogForm {
  items: MealItem[];
  protein: string;
  calories: string;
  notes: string;
  /**
   * True once the user touches a macro field. From then on item changes stop
   * rewriting the numbers; their estimate beats ours.
   */
  macrosEdited: boolean;
}

export const initialMealLogForm: MealLogForm = {
  items: [],
  protein: "",
  calories: "",
  notes: "",
  macrosEdited: false,
};

export function itemFromPreset(preset: FoodPreset): MealItem {
  return {
    key: preset.id,
    name: preset.name,
    protein: preset.protein,
    calories: preset.calories,
    fiber: preset.fiber,
    waterOz: preset.waterOz,
    isCustom: false,
  };
}

export function customItem(name: string): MealItem {
  return { key: `custom:${name.trim().toLowerCase()}`, name: name.trim(), protein: 0, calories: 0, isCustom: true };
}

/** A composite meal the LLM parsed from typed text — one named part with its macros. */
export function itemFromParsed(name: string, protein: number, calories: number): MealItem {
  return { key: `parsed:${name.trim().toLowerCase()}`, name: name.trim(), protein: Math.round(protein), calories: Math.round(calories), isCustom: true };
}

export function itemTotals(items: MealItem[]): { protein: number; calories: number; fiber: number; waterOz: number } {
  return {
    protein: Math.round(items.reduce((sum, i) => sum + i.protein, 0)),
    calories: Math.round(items.reduce((sum, i) => sum + i.calories, 0)),
    fiber: Math.round(items.reduce((sum, i) => sum + (i.fiber ?? 0), 0)),
    waterOz: Math.round(items.reduce((sum, i) => sum + (i.waterOz ?? 0), 0)),
  };
}

/** Re-derive the macro fields from the items unless the user took over. */
function syncMacros(form: MealLogForm): MealLogForm {
  if (form.macrosEdited) return form;
  const totals = itemTotals(form.items);
  return {
    ...form,
    protein: form.items.length > 0 ? String(totals.protein) : "",
    calories: form.items.length > 0 ? String(totals.calories) : "",
  };
}

export function addItem(form: MealLogForm, item: MealItem): MealLogForm {
  if (form.items.some((existing) => existing.key === item.key)) return form;
  return syncMacros({ ...form, items: [...form.items, item] });
}

export function removeItem(form: MealLogForm, key: string): MealLogForm {
  return syncMacros({ ...form, items: form.items.filter((item) => item.key !== key) });
}

/** Hand macro control back to the estimate after a manual override. */
export function resetMacrosToEstimate(form: MealLogForm): MealLogForm {
  return syncMacros({ ...form, macrosEdited: false });
}

export function combinedFoodName(items: MealItem[]): string {
  return items.map((item) => item.name).join(" + ");
}

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
  const foodName = combinedFoodName(form.items).trim();
  if (!foodName) {
    throw new Error("Add at least one food");
  }

  const notes = form.notes.trim();
  // Fiber and water come from the presets only; a manual macro override
  // covers protein and calories, the rest stays the catalog's estimate.
  const { fiber, waterOz } = itemTotals(form.items);

  return {
    recordedAt,
    source: "manual",
    foodName,
    protein: parseNonnegativeNumber(form.protein, "Protein"),
    calories: parseNonnegativeNumber(form.calories, "Calories"),
    ...(fiber > 0 ? { fiber } : {}),
    ...(waterOz > 0 ? { waterOz } : {}),
    ...(notes ? { notes } : {}),
  };
}
