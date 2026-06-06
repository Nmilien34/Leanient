import { describe, expect, it } from "vitest";
import {
  ACCOUNT_HEADER_TOP_PADDING,
  ACCOUNT_PROFILE_TOP_PADDING,
} from "../../screens/app/accountLayout";

describe("account screen layout", () => {
  it("keeps the back button and first content comfortably below the top edge", () => {
    expect(ACCOUNT_HEADER_TOP_PADDING).toBeGreaterThanOrEqual(18);
    expect(ACCOUNT_PROFILE_TOP_PADDING).toBeGreaterThanOrEqual(16);
  });
});
