import { describe, expect, it } from "vitest";
import type { User } from "@leanient/shared";
import { deriveAccountView } from "../../screens/app/accountMetrics";
import { mockUser } from "../../mocks/user";

describe("deriveAccountView", () => {
  it("maps identity fields and marks Apple linked from the mock user", () => {
    const v = deriveAccountView(mockUser);
    expect(v.name).toBe("Nickson");
    expect(v.email).toBe("nickson@lawnstack.com");
    const apple = v.providers.find((p) => p.provider === "apple");
    const google = v.providers.find((p) => p.provider === "google");
    expect(apple).toMatchObject({ label: "Sign in with Apple", linked: true, status: "Linked" });
    expect(google).toMatchObject({ label: "Sign in with Google", linked: false, status: "Connect" });
  });

  it("falls back gracefully when name/email are missing", () => {
    const bare: User = {
      id: "u",
      emailVerified: false,
      authProviders: [],
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const v = deriveAccountView(bare);
    expect(v.name).toBe("Member");
    expect(v.email).toBeNull();
    expect(v.providers.every((p) => !p.linked)).toBe(true);
  });
});
