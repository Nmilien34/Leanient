import { describe, expect, it } from "vitest";
import { staggeredRevealDelay } from "../../components/layout/staggeredRevealTiming";

describe("staggeredRevealDelay", () => {
  it("staggers sections by the configured interval", () => {
    expect(staggeredRevealDelay(0)).toBe(0);
    expect(staggeredRevealDelay(1)).toBe(70);
    expect(staggeredRevealDelay(3)).toBe(210);
  });

  it("guards negative indexes and caps long screens", () => {
    expect(staggeredRevealDelay(-2)).toBe(0);
    expect(staggeredRevealDelay(20)).toBe(420);
  });
});
