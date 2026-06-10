import { describe, expect, it } from "vitest";
import { providerCanBeLinkedFromSettings } from "../../screens/app/accountAuthLinking";

describe("account auth linking", () => {
  it("allows unlinked Apple accounts to be connected from iOS settings", () => {
    expect(
      providerCanBeLinkedFromSettings({
        provider: "apple",
        linked: false,
        platform: "ios",
      }),
    ).toBe(true);
  });

  it("does not offer linking for already linked or unsupported provider rows", () => {
    expect(
      providerCanBeLinkedFromSettings({
        provider: "apple",
        linked: true,
        platform: "ios",
      }),
    ).toBe(false);
    expect(
      providerCanBeLinkedFromSettings({
        provider: "google",
        linked: false,
        platform: "ios",
      }),
    ).toBe(false);
    expect(
      providerCanBeLinkedFromSettings({
        provider: "apple",
        linked: false,
        platform: "android",
      }),
    ).toBe(false);
  });
});
