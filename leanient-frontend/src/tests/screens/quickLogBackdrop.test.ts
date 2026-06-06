import { describe, expect, it } from "vitest";
import {
  QUICK_LOG_BACKDROP_BLUR_INTENSITY,
  QUICK_LOG_BACKDROP_DIM_COLOR,
} from "../../components/app/quickLogBackdrop";

function alphaFromRgba(color: string): number {
  const match = color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)/);
  return match ? Number(match[1]) : Number.NaN;
}

describe("quick log backdrop", () => {
  it("keeps the prior screen softly visible behind the sheet", () => {
    expect(QUICK_LOG_BACKDROP_BLUR_INTENSITY).toBeLessThanOrEqual(36);
    expect(alphaFromRgba(QUICK_LOG_BACKDROP_DIM_COLOR)).toBeLessThanOrEqual(0.22);
  });
});
