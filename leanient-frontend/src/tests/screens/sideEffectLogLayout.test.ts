import { describe, expect, it } from "vitest";
import {
  SIDE_EFFECT_FLOATING_CTA_BOTTOM_PADDING,
  SIDE_EFFECT_SCROLL_BOTTOM_PADDING,
} from "../../screens/app/sideEffectLogLayout";

describe("side effect log screen layout", () => {
  it("keeps enough scroll padding for the floating save button above the keyboard", () => {
    expect(SIDE_EFFECT_FLOATING_CTA_BOTTOM_PADDING).toBeGreaterThanOrEqual(20);
    expect(SIDE_EFFECT_SCROLL_BOTTOM_PADDING).toBeGreaterThanOrEqual(SIDE_EFFECT_FLOATING_CTA_BOTTOM_PADDING + 80);
  });
});
