import { describe, expect, it } from "vitest";
import {
  ACCOUNT_HEADER_TOP_PADDING,
  ACCOUNT_PROFILE_TOP_PADDING,
} from "../../screens/app/accountLayout";

describe("account screen layout", () => {
  // Notch clearance is handled by ModalSafeArea's safe-area inset; these paddings
  // are only the small in-content gaps that sit on top of that inset.
  it("uses small, non-negative in-content top gaps", () => {
    expect(ACCOUNT_HEADER_TOP_PADDING).toBeGreaterThanOrEqual(0);
    expect(ACCOUNT_HEADER_TOP_PADDING).toBeLessThanOrEqual(24);
    expect(ACCOUNT_PROFILE_TOP_PADDING).toBeGreaterThanOrEqual(0);
  });
});
