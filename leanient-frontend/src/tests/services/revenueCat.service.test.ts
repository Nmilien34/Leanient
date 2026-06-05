import { describe, expect, it } from "vitest";
import { createRevenueCatService } from "../../services/revenueCat.service";

describe("RevenueCat service", () => {
  it("is a safe no-op when API keys are missing", async () => {
    const service = createRevenueCatService({
      iosApiKey: "",
      androidApiKey: "",
      platform: "ios",
    });

    await expect(service.configure()).resolves.toBe(false);
    await expect(service.syncSubscriptionStatus()).resolves.toBeUndefined();
    expect(service.isRevenueCatConfigured()).toBe(false);
  });
});
