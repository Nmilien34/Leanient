import { describe, expect, it } from "vitest";
import { DOSE_LOG_HEADER_TOP_PADDING } from "../../screens/app/doseLogLayout";

describe("dose log screen layout", () => {
  it("keeps the close button comfortably below the top edge", () => {
    expect(DOSE_LOG_HEADER_TOP_PADDING).toBeGreaterThanOrEqual(18);
  });
});
