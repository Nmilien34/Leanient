import type { MealParseResponse } from "@leanient/shared";
import { env } from "../config/env";
import { NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";

const LOOKUP_TIMEOUT_MS = 6000;
const OFF_FIELDS = "product_name,brands,nutriments,serving_size,serving_quantity";
// Open Food Facts asks every caller to identify itself with a descriptive User-Agent.
const OFF_USER_AGENT = "Leanient/1.0 (support@leanient.app)";
const NUTRITIONIX_ITEM_URL = "https://trackapi.nutritionix.com/v2/search/item";

type OffNutriments = Record<string, unknown>;

interface OffPayload {
  status?: number;
  product?: {
    product_name?: unknown;
    brands?: unknown;
    serving_size?: unknown;
    nutriments?: OffNutriments;
  };
}

interface NutritionixFood {
  food_name?: unknown;
  brand_name?: unknown;
  serving_qty?: unknown;
  serving_unit?: unknown;
  nf_calories?: unknown;
  nf_protein?: unknown;
}

interface NutritionixPayload {
  foods?: NutritionixFood[];
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/** First present, non-null value across candidate nutriment keys. */
function pickNutriment(n: OffNutriments, keys: string[]): number | null {
  for (const key of keys) {
    const v = num(n[key]);
    if (v != null) return v;
  }
  return null;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: controller.signal });
    if (!res.ok) {
      // 404 from a food DB just means "not in this source" — not an error.
      if (res.status !== 404) {
        logger.warn({ url, status: res.status }, "[barcode] source responded non-ok");
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    logger.warn({ error, url }, "[barcode] source request failed");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Maps a Nutritionix item-search food (per its serving) to our meal shape.
 * Nutritionix is the most reliable source for US branded/packaged products.
 */
export function mapNutritionixFood(payload: NutritionixPayload | null | undefined): MealParseResponse | null {
  const food = payload?.foods?.[0];
  if (!food) return null;

  const brand = typeof food.brand_name === "string" ? food.brand_name.trim() : "";
  const foodName = typeof food.food_name === "string" ? food.food_name.trim() : "";
  const name = [brand, foodName].filter(Boolean).join(" ").trim();
  if (!name) return null;

  const protein = num(food.nf_protein);
  const calories = num(food.nf_calories);
  if ((protein ?? 0) <= 0 && (calories ?? 0) <= 0) return null;

  const qty = num(food.serving_qty);
  const unit = typeof food.serving_unit === "string" ? food.serving_unit.trim() : "";
  const servingLabel = qty != null && unit ? `${qty} ${unit}` : "serving";
  const proteinG = Math.max(0, Math.round(protein ?? 0));
  const cal = Math.max(0, Math.round(calories ?? 0));

  return {
    name,
    components: [{ name: `${name} (${servingLabel})`, protein: proteinG, calories: cal }],
    protein: proteinG,
    calories: cal,
    confidence: 0.95,
  };
}

/**
 * Maps an Open Food Facts product payload to our composite-meal shape, preferring
 * per-serving macros and falling back to per-100g. Returns null when the product
 * is missing, unnamed, or has no usable protein/calorie data (an OFF stub).
 */
export function mapOffProduct(payload: OffPayload | null | undefined): MealParseResponse | null {
  if (!payload || payload.status !== 1 || !payload.product) return null;
  const p = payload.product;

  const brand = typeof p.brands === "string" ? p.brands.split(",")[0]?.trim() : "";
  const productName = typeof p.product_name === "string" ? p.product_name.trim() : "";
  const name = [brand, productName].filter(Boolean).join(" ").trim();
  if (!name) return null;

  const n: OffNutriments = p.nutriments ?? {};
  const protein = pickNutriment(n, ["proteins_serving", "proteins_100g", "proteins_value", "proteins"]);
  const calories = pickNutriment(n, ["energy-kcal_serving", "energy-kcal_100g", "energy-kcal_value", "energy-kcal"]);

  // No usable macros = an Open Food Facts stub (a name with no real data). Treat
  // it as not-found so the user types the food instead of logging a bogus 0/0 entry.
  if ((protein ?? 0) <= 0 && (calories ?? 0) <= 0) return null;

  const usedServing = num(n["proteins_serving"]) != null || num(n["energy-kcal_serving"]) != null;
  const servingLabel = usedServing ? (typeof p.serving_size === "string" && p.serving_size.trim()) || "serving" : "100 g";
  const proteinG = Math.max(0, Math.round(protein ?? 0));
  const cal = Math.max(0, Math.round(calories ?? 0));

  return {
    name,
    components: [{ name: `${name} (${servingLabel})`, protein: proteinG, calories: cal }],
    protein: proteinG,
    calories: cal,
    confidence: usedServing ? 0.85 : 0.65,
  };
}

async function lookupNutritionix(code: string): Promise<MealParseResponse | null> {
  if (!env.nutritionix.appId || !env.nutritionix.appKey) return null;
  const url = `${NUTRITIONIX_ITEM_URL}?upc=${encodeURIComponent(code)}`;
  const payload = await fetchJson<NutritionixPayload>(url, {
    "x-app-id": env.nutritionix.appId,
    "x-app-key": env.nutritionix.appKey,
  });
  return mapNutritionixFood(payload);
}

async function lookupOpenFoodFacts(code: string): Promise<MealParseResponse | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;
  const payload = await fetchJson<OffPayload>(url, { "User-Agent": OFF_USER_AGENT });
  return mapOffProduct(payload);
}

/**
 * Looks a scanned barcode up across sources, best-coverage first: Nutritionix
 * (US branded, when configured) → Open Food Facts (free, international). Codes
 * found in neither 404 so the user types the food or scans a photo instead.
 */
export async function lookupBarcode(code: string): Promise<MealParseResponse> {
  const fromNutritionix = await lookupNutritionix(code);
  if (fromNutritionix) return fromNutritionix;

  const fromOff = await lookupOpenFoodFacts(code);
  if (fromOff) return fromOff;

  throw new NotFoundError("We couldn't find that barcode. Try typing the product or scanning a photo.");
}
