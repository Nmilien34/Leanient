import { describe, expect, it } from "vitest";
import type { SubscriptionStatus, User } from "@leanient/shared";
import { deriveSubscription } from "../../screens/app/subscriptionMetrics";
import { mockUser } from "../../mocks/user";

function userWith(status: SubscriptionStatus, extra: Partial<User> = {}): User {
  return { ...mockUser, subscriptionStatus: status, ...extra };
}

describe("deriveSubscription", () => {
  it("renders an active annual plan with renewal date and per-month price", () => {
    const v = deriveSubscription(mockUser); // active, renews 2027-03-03, willRenew
    expect(v.planLabel).toBe("INTACT · ANNUAL");
    expect(v.priceLine).toBe("$29.99 / year");
    expect(v.statusLine).toBe("Renews Mar 3, 2027 · that's $2.50/mo");
    expect(v.isSubscribed).toBe(true);
    expect(v.primaryActionLabel).toBe("Change plan");
    expect(v.showCancel).toBe(true);
    expect(v.features).toHaveLength(3);
  });

  it("shows a non-renewing end date when cancelled but still active", () => {
    const v = deriveSubscription(userWith("active_canceled", { subscriptionWillRenew: false }));
    expect(v.statusLine).toBe("Access until Mar 3, 2027. Won't renew.");
    expect(v.primaryActionLabel).toBe("Resume plan");
    expect(v.showCancel).toBe(false);
    expect(v.isSubscribed).toBe(true);
  });

  it("frames a trial with its end date", () => {
    const v = deriveSubscription(userWith("trialing"));
    expect(v.planLabel).toBe("INTACT · FREE TRIAL");
    expect(v.priceLine).toBe("Then $29.99 / year");
    expect(v.statusLine).toBe("Trial ends Mar 3, 2027");
  });

  it("prompts an upgrade and hides billing when not subscribed", () => {
    const v = deriveSubscription(userWith("free", { entitlementExpiresAt: undefined }));
    expect(v.planLabel).toBe("FREE PLAN");
    expect(v.priceLine).toBe("Not subscribed");
    expect(v.isSubscribed).toBe(false);
    expect(v.primaryActionLabel).toBe("Upgrade to Intact");
    expect(v.showCancel).toBe(false);
  });

  it("flags a failed payment as past due", () => {
    const v = deriveSubscription(userWith("past_due"));
    expect(v.statusLine).toBe("Payment failed. Update it to keep your access.");
    expect(v.primaryActionLabel).toBe("Fix payment");
    expect(v.isSubscribed).toBe(true);
  });
});
