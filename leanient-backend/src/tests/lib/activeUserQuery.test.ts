import { describe, expect, it } from "vitest";
import { activeUserQuery } from "../../lib/activeUserQuery";

describe("activeUserQuery", () => {
  it("returns the background-work active user filter", () => {
    expect(activeUserQuery()).toEqual({
      onboardingComplete: true,
      subscriptionStatus: { $in: ["trialing", "active"] },
    });
  });

  it("keeps active-user fields authoritative when additional filters overlap", () => {
    expect(
      activeUserQuery({
        onboardingComplete: false,
        subscriptionStatus: "free",
        revenueCatCustomerId: "rc_123",
      }),
    ).toEqual({
      revenueCatCustomerId: "rc_123",
      onboardingComplete: true,
      subscriptionStatus: { $in: ["trialing", "active"] },
    });
  });
});
