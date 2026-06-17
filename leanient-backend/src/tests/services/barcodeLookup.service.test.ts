import { describe, expect, it } from "vitest";
import { mapOffProduct } from "../../services/barcodeLookup.service";

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
    expect(result!.confidence).toBe(0.9);
  });

  it("falls back to per-100g with lower confidence when no serving data", () => {
    const result = mapOffProduct({
      status: 1,
      product: { product_name: "Tuna", nutriments: { "proteins_100g": 26, "energy-kcal_100g": 116 } },
    })!;
    expect(result.protein).toBe(26);
    expect(result.calories).toBe(116);
    expect(result.components[0].name).toContain("100 g");
    expect(result.confidence).toBe(0.7);
  });

  it("returns null for not-found, unnamed, or macro-less products", () => {
    expect(mapOffProduct({ status: 0 })).toBeNull();
    expect(mapOffProduct({ status: 1, product: { nutriments: { "proteins_serving": 5 } } })).toBeNull();
    expect(mapOffProduct({ status: 1, product: { product_name: "Mystery", nutriments: {} } })).toBeNull();
    expect(mapOffProduct(null)).toBeNull();
  });
});
