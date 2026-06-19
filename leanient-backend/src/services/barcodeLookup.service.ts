import type { MealParseResponse } from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";

const OFF_TIMEOUT_MS = 6000;
const OFF_FIELDS = "product_name,brands,nutriments,serving_size,serving_quantity";
// Open Food Facts asks every caller to identify itself with a descriptive User-Agent.
const OFF_USER_AGENT = "Leanient/1.0 (support@leanient.app)";

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

/**
 * Maps an Open Food Facts product payload to our composite-meal shape, preferring
 * per-serving macros and falling back to per-100g. Returns null when the product
 * is missing, unnamed, or has no usable protein/calorie data — the caller treats
 * null as "not found" so the user can type it or scan a photo instead.
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
  // it as not-found so the user types the food instead of logging a bogus
  // 0-protein, 0-calorie entry.
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

/** Looks a scanned barcode up in Open Food Facts and maps it to a loggable meal. */
export async function lookupBarcode(code: string): Promise<MealParseResponse> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;

  let payload: OffPayload;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": OFF_USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`Open Food Facts responded ${res.status}`);
    }
    payload = (await res.json()) as OffPayload;
  } catch (error) {
    logger.warn({ error, code }, "[barcode] lookup request failed");
    throw new AppError({
      code: ERROR_CODES.mealScanVisionFailed,
      message: "Barcode lookup is unavailable right now. Try again, or add it by hand.",
      statusCode: 503,
      details: { retryable: true },
      expose: true,
    });
  }

  const mapped = mapOffProduct(payload);
  if (!mapped) {
    throw new NotFoundError("We couldn't find that barcode. Try typing the product or scanning a photo.");
  }
  return mapped;
}
