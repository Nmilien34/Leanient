import { describe, expect, it } from "vitest";
import { mapNutritionixFood, mapOffProduct } from "../../services/barcodeLookup.service";

describe("mapNutritionixFood", () => {
  it("maps the first food with brand + per-serving macros", () => {
    const result = mapNutritionixFood({
      foods: [{ food_name: "Greek Yogurt", brand_name: "Chobani", serving_qty: 1, serving_unit: "container", nf_protein: 15, nf_calories: 120 }],
    })!;
    expect(result.name).toBe("Chobani Greek Yogurt");
    expect(result.protein).toBe(15);
    expect(result.calories).toBe(120);
    expect(result.components[0].name).toContain("1 container");
    expect(result.confidence).toBe(0.95);
  });

  it("returns null for empty results or macro-less stubs", () => {
    expect(mapNutritionixFood({ foods: [] })).toBeNull();
    expect(mapNutritionixFood(null)).toBeNull();
    expect(mapNutritionixFood({ foods: [{ food_name: "Water", nf_protein: 0, nf_calories: 0 }] })).toBeNull();
  });
});

describe("mapOffProduct", () => {
  it("maps a found product, preferring per-serving macros and naming with brand", () => {
    const result = mapOffProduct({
      status: 1,
      product: {
        product_name: "Greek Yogurt",
        brands: "Chobani, Other",
        serving_size: "150 g",
        nutriments: { "proteins_serving": 15, "energy-kcal_serving": 120, "proteins_100g": 10, "energy-kcal_100g": 80 },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Chobani Greek Yogurt");
    expect(result!.protein).toBe(15);
    expect(result!.calories).toBe(120);
    expect(result!.components[0].name).toContain("150 g");
    expect(result!.confidence).toBe(0.85);
  });

  it("falls back to per-100g with lower confidence when no serving data", () => {
    const result = mapOffProduct({
      status: 1,
      product: { product_name: "Tuna", nutriments: { "proteins_100g": 26, "energy-kcal_100g": 116 } },
    })!;
    expect(result.protein).toBe(26);
    expect(result.calories).toBe(116);
    expect(result.components[0].name).toContain("100 g");
    expect(result.confidence).toBe(0.65);
  });

  it("fills each macro independently when serving data is partial", () => {
    // Calories only at serving level, protein only at 100g — both should populate.
    const result = mapOffProduct({
      status: 1,
      product: { product_name: "Bar", nutriments: { "energy-kcal_serving": 210, "proteins_100g": 20 } },
    })!;
    expect(result.calories).toBe(210);
    expect(result.protein).toBe(20);
  });

  it("rejects Open Food Facts stubs with no usable macros (the 0/0 bug)", () => {
    expect(mapOffProduct({ status: 0 })).toBeNull();
    expect(mapOffProduct({ status: 1, product: { nutriments: { "proteins_serving": 5 } } })).toBeNull(); // no name
    expect(mapOffProduct({ status: 1, product: { product_name: "Mystery", nutriments: {} } })).toBeNull(); // no macros
    expect(mapOffProduct({ status: 1, product: { product_name: "Water", nutriments: { "proteins_100g": 0, "energy-kcal_100g": 0 } } })).toBeNull(); // 0/0 stub
    expect(mapOffProduct(null)).toBeNull();
  });
});
