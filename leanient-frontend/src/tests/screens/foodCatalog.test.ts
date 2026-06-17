import { describe, expect, it } from "vitest";
import { splitMealParts } from "../../screens/app/foodCatalog";

describe("splitMealParts", () => {
  it("splits a list into the parts of one meal", () => {
    expect(splitMealParts("rice, beans and chicken")).toEqual(["rice", "beans", "chicken"]);
    expect(splitMealParts("eggs + turkey & toast")).toEqual(["eggs", "turkey", "toast"]);
    expect(splitMealParts("oatmeal with berries")).toEqual(["oatmeal", "berries"]);
  });

  it("keeps a phrase with no separators as a single composite part", () => {
    expect(splitMealParts("chipotle chicken sandwich")).toEqual(["chipotle chicken sandwich"]);
  });

  it("trims, drops empties, and dedupes case-insensitively", () => {
    expect(splitMealParts("  egg , , egg ,EGG, toast ")).toEqual(["egg", "toast"]);
    expect(splitMealParts("")).toEqual([]);
  });
});
