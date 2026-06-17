/**
 * Built-in food presets for the manual meal log. Each entry carries typical
 * macros for one normal serving so the user picks foods and the protein and
 * calorie fields fill themselves; they stay editable for portions that differ.
 * Values are deliberately typical, rounded estimates. Fiber and water ride
 * along where they are meaningful so manual meals feed the derived hydration
 * line the same way scans do.
 */

export interface FoodPreset {
  id: string;
  name: string;
  /** Serving the macros describe, shown in suggestions ("1 cup", "6 oz"). */
  serving: string;
  protein: number;
  calories: number;
  fiber?: number;
  waterOz?: number;
  /** Extra search words ("hamburger" finds Burger). */
  keywords?: string[];
  /** Picker section. */
  category: "breakfast" | "sandwiches" | "meals" | "snacks";
}

export const FOOD_CATALOG: FoodPreset[] = [
  // Breakfast
  { id: "greek_yogurt", name: "Greek yogurt", serving: "1 cup", protein: 20, calories: 130, waterOz: 6, keywords: ["yoghurt"], category: "breakfast" },
  { id: "eggs", name: "Scrambled eggs", serving: "2 large", protein: 12, calories: 180, keywords: ["egg"], category: "breakfast" },
  { id: "egg_white_omelet", name: "Egg white omelet", serving: "3 whites", protein: 20, calories: 140, category: "breakfast" },
  { id: "oatmeal", name: "Oatmeal", serving: "1 bowl", protein: 6, calories: 160, fiber: 4, waterOz: 6, keywords: ["oats", "porridge"], category: "breakfast" },
  { id: "avocado_toast", name: "Avocado toast", serving: "1 slice", protein: 8, calories: 290, fiber: 7, category: "breakfast" },
  { id: "breakfast_burrito", name: "Breakfast burrito", serving: "1 burrito", protein: 22, calories: 450, fiber: 4, category: "breakfast" },
  { id: "bagel_cream_cheese", name: "Bagel with cream cheese", serving: "1 bagel", protein: 10, calories: 360, category: "breakfast" },
  { id: "pancakes", name: "Pancakes", serving: "3 medium", protein: 8, calories: 420, keywords: ["waffles"], category: "breakfast" },
  { id: "protein_smoothie", name: "Protein smoothie", serving: "16 oz", protein: 28, calories: 260, fiber: 3, waterOz: 12, keywords: ["shake"], category: "breakfast" },
  { id: "cottage_cheese", name: "Cottage cheese", serving: "1 cup", protein: 25, calories: 180, waterOz: 6, category: "breakfast" },

  // Sandwiches & wraps
  { id: "turkey_sandwich", name: "Turkey sandwich", serving: "1 sandwich", protein: 25, calories: 350, fiber: 3, category: "sandwiches" },
  { id: "turkey_club", name: "Turkey club", serving: "1 sandwich", protein: 32, calories: 520, category: "sandwiches" },
  { id: "ham_cheese_sandwich", name: "Ham and cheese sandwich", serving: "1 sandwich", protein: 22, calories: 380, category: "sandwiches" },
  { id: "tuna_sandwich", name: "Tuna sandwich", serving: "1 sandwich", protein: 22, calories: 360, category: "sandwiches" },
  { id: "blt", name: "BLT", serving: "1 sandwich", protein: 14, calories: 400, keywords: ["bacon lettuce tomato"], category: "sandwiches" },
  { id: "grilled_cheese", name: "Grilled cheese", serving: "1 sandwich", protein: 14, calories: 440, category: "sandwiches" },
  { id: "chicken_wrap", name: "Chicken wrap", serving: "1 wrap", protein: 30, calories: 420, fiber: 3, category: "sandwiches" },
  { id: "veggie_wrap", name: "Veggie wrap", serving: "1 wrap", protein: 10, calories: 330, fiber: 6, category: "sandwiches" },
  { id: "burger", name: "Burger", serving: "1 burger", protein: 28, calories: 540, keywords: ["hamburger", "cheeseburger"], category: "sandwiches" },

  // Meals & bowls
  { id: "chicken_breast", name: "Grilled chicken breast", serving: "6 oz", protein: 52, calories: 280, category: "meals" },
  { id: "chicken_rice_bowl", name: "Chicken and rice bowl", serving: "1 bowl", protein: 45, calories: 550, fiber: 3, category: "meals" },
  { id: "chicken_caesar", name: "Chicken Caesar salad", serving: "1 bowl", protein: 35, calories: 470, fiber: 3, keywords: ["salad"], category: "meals" },
  { id: "chicken_stir_fry", name: "Chicken stir fry", serving: "1 plate", protein: 35, calories: 430, fiber: 4, waterOz: 4, category: "meals" },
  { id: "rotisserie_chicken", name: "Rotisserie chicken", serving: "1 quarter", protein: 40, calories: 330, category: "meals" },
  { id: "steak", name: "Steak", serving: "8 oz", protein: 56, calories: 480, keywords: ["sirloin", "ribeye"], category: "meals" },
  { id: "pork_chop", name: "Pork chop", serving: "1 chop", protein: 34, calories: 290, category: "meals" },
  { id: "salmon_veg", name: "Salmon with vegetables", serving: "6 oz fillet", protein: 38, calories: 450, fiber: 4, waterOz: 5, keywords: ["fish"], category: "meals" },
  { id: "shrimp_rice", name: "Shrimp and rice", serving: "1 plate", protein: 30, calories: 400, category: "meals" },
  { id: "tofu_broccoli_bowl", name: "Tofu and broccoli rice bowl", serving: "1 bowl", protein: 29, calories: 540, fiber: 6, waterOz: 8, category: "meals" },
  { id: "burrito_bowl", name: "Burrito bowl", serving: "1 bowl", protein: 32, calories: 650, fiber: 10, keywords: ["chipotle"], category: "meals" },
  { id: "tacos", name: "Tacos", serving: "2 tacos", protein: 24, calories: 420, fiber: 4, category: "meals" },
  { id: "spaghetti_meatballs", name: "Spaghetti and meatballs", serving: "1 plate", protein: 28, calories: 620, fiber: 5, keywords: ["pasta"], category: "meals" },
  { id: "pizza", name: "Pizza", serving: "2 slices", protein: 22, calories: 560, category: "meals" },
  { id: "sushi", name: "Sushi roll", serving: "8 pieces", protein: 18, calories: 350, category: "meals" },
  { id: "chili", name: "Chili", serving: "1 bowl", protein: 28, calories: 380, fiber: 9, waterOz: 8, category: "meals" },
  { id: "chicken_noodle_soup", name: "Chicken noodle soup", serving: "1 bowl", protein: 12, calories: 220, waterOz: 10, keywords: ["soup"], category: "meals" },
  { id: "ramen", name: "Ramen", serving: "1 bowl", protein: 18, calories: 480, waterOz: 12, keywords: ["noodles"], category: "meals" },

  // Snacks & drinks
  { id: "protein_shake", name: "Protein shake", serving: "1 scoop + water", protein: 25, calories: 150, waterOz: 10, keywords: ["whey"], category: "snacks" },
  { id: "protein_bar", name: "Protein bar", serving: "1 bar", protein: 20, calories: 200, fiber: 3, category: "snacks" },
  { id: "tuna_pouch", name: "Tuna pouch", serving: "1 pouch", protein: 18, calories: 90, category: "snacks" },
  { id: "hard_boiled_egg", name: "Hard boiled egg", serving: "1 egg", protein: 6, calories: 70, category: "snacks" },
  { id: "string_cheese", name: "String cheese", serving: "1 stick", protein: 7, calories: 80, category: "snacks" },
  { id: "beef_jerky", name: "Beef jerky", serving: "1 oz", protein: 11, calories: 80, category: "snacks" },
  { id: "almonds", name: "Almonds", serving: "1 handful", protein: 6, calories: 160, fiber: 3, keywords: ["nuts"], category: "snacks" },
  { id: "apple_pb", name: "Apple with peanut butter", serving: "1 apple + 2 tbsp", protein: 8, calories: 270, fiber: 6, waterOz: 4, category: "snacks" },
  { id: "hummus_veggies", name: "Hummus and veggies", serving: "1 snack plate", protein: 6, calories: 180, fiber: 5, waterOz: 3, category: "snacks" },
  { id: "edamame", name: "Edamame", serving: "1 cup", protein: 17, calories: 190, fiber: 8, category: "snacks" },
  { id: "cottage_cheese_cup", name: "Cottage cheese snack cup", serving: "1 cup (5 oz)", protein: 11, calories: 90, category: "snacks" },
  { id: "yogurt_drink", name: "Yogurt protein drink", serving: "1 bottle", protein: 10, calories: 170, waterOz: 8, category: "snacks" },
  { id: "milk", name: "Milk", serving: "1 glass", protein: 8, calories: 120, waterOz: 8, category: "snacks" },
  { id: "latte", name: "Latte", serving: "12 oz", protein: 8, calories: 150, waterOz: 10, keywords: ["coffee"], category: "snacks" },
  { id: "banana", name: "Banana", serving: "1 medium", protein: 1, calories: 105, fiber: 3, category: "snacks" },
  { id: "trail_mix", name: "Trail mix", serving: "1 handful", protein: 5, calories: 220, fiber: 3, category: "snacks" },
];

/** Quick picks shown before the user types, highest-frequency foods first. */
export const POPULAR_FOOD_IDS = [
  "protein_shake",
  "greek_yogurt",
  "eggs",
  "chicken_breast",
  "protein_bar",
  "cottage_cheese",
  "turkey_sandwich",
  "chicken_rice_bowl",
  "tuna_pouch",
  "chicken_caesar",
] as const;

export const FOOD_CATEGORY_LABELS: Record<FoodPreset["category"], string> = {
  breakfast: "BREAKFAST",
  sandwiches: "SANDWICHES & WRAPS",
  meals: "MEALS & BOWLS",
  snacks: "SNACKS & DRINKS",
};

export function popularFoods(): FoodPreset[] {
  return POPULAR_FOOD_IDS.map((id) => FOOD_CATALOG.find((f) => f.id === id)).filter(
    (f): f is FoodPreset => f !== undefined,
  );
}

/**
 * Rank presets against a query: whole-name prefix beats word prefix beats
 * substring beats keyword match. Already-picked ids are excluded so the
 * suggestion list never offers a pill the user just added.
 */
export function searchFoods(query: string, excludeIds: string[] = [], limit = 6): FoodPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const excluded = new Set(excludeIds);
  const scored: { food: FoodPreset; score: number }[] = [];

  for (const food of FOOD_CATALOG) {
    if (excluded.has(food.id)) continue;
    const name = food.name.toLowerCase();
    let score = 0;
    if (name.startsWith(q)) score = 4;
    else if (name.split(" ").some((word) => word.startsWith(q))) score = 3;
    else if (name.includes(q)) score = 2;
    else if (food.keywords?.some((k) => k.toLowerCase().includes(q))) score = 1;
    if (score > 0) scored.push({ food, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((s) => s.food);
}

/**
 * Splits a typed phrase into a meal's parts: "rice, beans and chicken" becomes
 * three components of ONE meal, not three meals. A phrase with no separators
 * ("chipotle chicken sandwich") stays a single part. Trims, drops empties, and
 * dedupes case-insensitively so "egg, egg" doesn't double up.
 */
export function splitMealParts(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/\s*(?:,|\band\b|\+|&|\bwith\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (part.length === 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
