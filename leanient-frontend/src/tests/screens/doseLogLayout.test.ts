import { describe, expect, it } from "vitest";
import { DOSE_LOG_HEADER_TOP_PADDING } from "../../screens/app/doseLogLayout";

describe("dose log screen layout", () => {
  // Notch clearance is handled by ModalSafeArea's safe-area inset; this padding is
  // only the small in-content gap that sits on top of that inset.
  it("uses a small, non-negative in-content top gap", () => {
    expect(DOSE_LOG_HEADER_TOP_PADDING).toBeGreaterThanOrEqual(0);
    expect(DOSE_LOG_HEADER_TOP_PADDING).toBeLessThanOrEqual(24);
  });
});
