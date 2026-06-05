import { describe, expect, it } from "vitest";
import { isOnboardingCompleteForRouting } from "../../navigation/onboardingRouting";

describe("onboarding routing decision", () => {
  it("prefers user.onboardingComplete true over profile state", () => {
    expect(
      isOnboardingCompleteForRouting({
        user: { onboardingComplete: true },
        hasProfile: false,
      }),
    ).toBe(true);
  });

  it("prefers user.onboardingComplete false even when a profile exists", () => {
    expect(
      isOnboardingCompleteForRouting({
        user: { onboardingComplete: false },
        hasProfile: true,
      }),
    ).toBe(false);
  });

  it("falls back to profile existence for legacy users without the field", () => {
    expect(
      isOnboardingCompleteForRouting({
        user: {},
        hasProfile: true,
      }),
    ).toBe(true);
    expect(
      isOnboardingCompleteForRouting({
        user: {},
        hasProfile: false,
      }),
    ).toBe(false);
  });
});
