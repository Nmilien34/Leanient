import { describe, expect, it } from "vitest";
import type { User } from "@leanient/shared";
import { faceConsentState } from "../../screens/app/faceConsent";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u",
    emailVerified: true,
    onboardingComplete: true,
    authProviders: [],
    hasAvatar: false,
    subscriptionStatus: "free",
    subscriptionWillRenew: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("faceConsentState", () => {
  it("is off with a prompt when there's no consent", () => {
    expect(faceConsentState(null)).toEqual({
      enabled: false,
      sinceLabel: null,
      entryLabel: "Turn on facial volume tracking",
    });
    expect(faceConsentState(user()).enabled).toBe(false);
  });

  it("is on with a since date when consent is stamped", () => {
    const state = faceConsentState(user({ faceAnalysisConsentAt: "2026-05-12T09:00:00.000Z" }));
    expect(state.enabled).toBe(true);
    expect(state.sinceLabel).toBe("May 12, 2026");
    expect(state.entryLabel).toBe("Facial volume tracking is on");
  });
});
