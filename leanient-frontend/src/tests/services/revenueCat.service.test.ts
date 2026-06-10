import { describe, expect, it, vi } from "vitest";
import {
  applyRevenueCatCustomerInfoToUser,
  createRevenueCatService,
} from "../../services/revenueCat.service";
import { mockUser } from "../../mocks/user";

function makeCustomerInfo(overrides: Record<string, unknown> = {}) {
  return {
    originalAppUserId: "user_1",
    entitlements: {
      active: {},
      all: {},
    },
    ...overrides,
  };
}

function makeClient() {
  const annualPackage = { identifier: "$rc_annual" };
  const monthlyPackage = { identifier: "$rc_monthly" };
  const customerInfo = makeCustomerInfo();

  return {
    annualPackage,
    monthlyPackage,
    customerInfo,
    client: {
      configure: vi.fn(),
      logIn: vi.fn().mockResolvedValue({ customerInfo, created: false }),
      getOfferings: vi.fn().mockResolvedValue({
        current: {
          annual: annualPackage,
          monthly: monthlyPackage,
          availablePackages: [annualPackage, monthlyPackage],
        },
      }),
      purchasePackage: vi.fn().mockResolvedValue({
        productIdentifier: "leanient_annual",
        customerInfo,
      }),
      restorePurchases: vi.fn().mockResolvedValue(customerInfo),
      getCustomerInfo: vi.fn().mockResolvedValue(customerInfo),
      syncPurchases: vi.fn().mockResolvedValue(undefined),
      PURCHASES_ERROR_CODE: {
        PURCHASE_CANCELLED_ERROR: "1",
      },
    },
  };
}

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

  it("configures RevenueCat with the Leanient user id so webhooks can unlock that user", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await expect(service.configure("user_1")).resolves.toBe(true);

    expect(client.configure).toHaveBeenCalledWith({
      apiKey: "ios_key",
      appUserID: "user_1",
    });
  });

  it("purchases the selected RevenueCat package from the current offering", async () => {
    const { client, annualPackage, customerInfo } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    const result = await service.purchasePlan({ planId: "annual", appUserId: "user_1" });

    expect(client.purchasePackage).toHaveBeenCalledWith(annualPackage);
    expect(result).toEqual({
      status: "purchased",
      customerInfo,
    });
  });

  it("returns a cancelled result when the user cancels the native purchase sheet", async () => {
    const { client } = makeClient();
    client.purchasePackage.mockRejectedValueOnce({ code: "1", userCancelled: true });
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await expect(service.purchasePlan({ planId: "monthly", appUserId: "user_1" })).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("maps active RevenueCat customer info onto the cached user while webhooks settle", () => {
    const user = { ...mockUser, id: "user_1", subscriptionStatus: "free" as const };
    const updated = applyRevenueCatCustomerInfoToUser(
      user,
      makeCustomerInfo({
        entitlements: {
          active: {
            leanient_pro: {
              identifier: "leanient_pro",
              isActive: true,
              willRenew: true,
              periodType: "TRIAL",
              expirationDate: "2026-06-17T00:00:00.000Z",
            },
          },
          all: {},
        },
      }),
    );

    expect(updated).toMatchObject({
      subscriptionStatus: "trialing",
      entitlementExpiresAt: "2026-06-17T00:00:00.000Z",
      subscriptionWillRenew: true,
      revenueCatCustomerId: "user_1",
      revenueCatEntitlement: "leanient_pro",
    });
  });
});
