import { beforeEach, describe, expect, it, vi } from "vitest";
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
      logOut: vi.fn().mockResolvedValue(customerInfo),
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
      collectDeviceIdentifiers: vi.fn().mockResolvedValue(undefined),
      setAppsflyerID: vi.fn().mockResolvedValue(undefined),
      PURCHASES_ERROR_CODE: {
        PURCHASE_CANCELLED_ERROR: "1",
      },
    },
  };
}

describe("RevenueCat service", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
  });

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

  it("configures RevenueCat with a null app user id for anonymous startup", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await expect(service.configure()).resolves.toBe(true);

    expect(client.configure).toHaveBeenCalledWith({
      apiKey: "ios_key",
      appUserID: null,
    });
    expect(client.logIn).not.toHaveBeenCalled();
  });

  it("associates AppsFlyer attribution when RevenueCat configures an anonymous app user", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { client } = makeClient();
    const getAppsFlyerId = vi.fn().mockResolvedValue("af-anonymous-1");
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
      getAppsFlyerId,
    });

    await service.configure();

    expect(getAppsFlyerId).toHaveBeenCalledWith(undefined);
    expect(client.collectDeviceIdentifiers).toHaveBeenCalledTimes(1);
    expect(client.setAppsflyerID).toHaveBeenCalledWith("af-anonymous-1");
    expect(log).toHaveBeenCalledWith("[Attribution Debug][temporary] RevenueCat collected device identifiers.");
    expect(log).toHaveBeenCalledWith(
      "[Attribution Debug][temporary] RevenueCat set $appsflyerId:",
      "af-anonymous-1",
    );
    log.mockRestore();
  });

  it("reapplies AppsFlyer attribution after RevenueCat logs in a known app user", async () => {
    const { client } = makeClient();
    const getAppsFlyerId = vi
      .fn()
      .mockResolvedValueOnce("af-anonymous-1")
      .mockResolvedValueOnce("af-user-1");
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
      getAppsFlyerId,
    });

    await service.configure();
    await service.configure("user_1");

    expect(client.logIn).toHaveBeenCalledWith("user_1");
    expect(getAppsFlyerId).toHaveBeenLastCalledWith("user_1");
    expect(client.setAppsflyerID).toHaveBeenLastCalledWith("af-user-1");
  });

  it("associates AppsFlyer attribution when the AppsFlyer ID becomes available after RevenueCat init", async () => {
    let listener: ((appsFlyerId: string) => void) | undefined;
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
      getAppsFlyerId: vi.fn().mockResolvedValue(undefined),
      onAppsFlyerIdAvailable: (nextListener) => {
        listener = nextListener;
        return () => undefined;
      },
    });

    await service.configure("user_1");
    listener?.("af-user-1");
    await Promise.resolve();
    await Promise.resolve();

    expect(client.collectDeviceIdentifiers).toHaveBeenCalledTimes(2);
    expect(client.setAppsflyerID).toHaveBeenCalledWith("af-user-1");
  });

  it("sends AppsFlyer attribution identifiers to RevenueCat before purchases", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await service.configure("user_1");
    await service.syncAppsFlyerAttribution("af-user-1");

    expect(client.collectDeviceIdentifiers).toHaveBeenCalledTimes(1);
    expect(client.setAppsflyerID).toHaveBeenCalledWith("af-user-1");
  });

  it("does not sync purchases without an authenticated RevenueCat app user id", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await service.configure();
    await expect(service.syncSubscriptionStatus()).resolves.toBeUndefined();

    expect(client.syncPurchases).not.toHaveBeenCalled();
    expect(client.getCustomerInfo).not.toHaveBeenCalled();
  });

  it("requires an authenticated RevenueCat app user id before restoring purchases", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await service.configure();

    await expect(service.restorePurchases()).rejects.toThrow("authenticated user");
    expect(client.restorePurchases).not.toHaveBeenCalled();
  });

  it("logs out the native RevenueCat identity", async () => {
    const { client } = makeClient();
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
    });

    await service.configure("user_1");
    await service.logOut();

    expect(client.logOut).toHaveBeenCalledTimes(1);
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

  it("syncs AppsFlyer attribution to RevenueCat before opening the purchase sheet", async () => {
    const calls: string[] = [];
    const { client, customerInfo } = makeClient();
    const getAppsFlyerId = vi.fn().mockImplementation(async () => {
      calls.push("read-appsflyer-id");
      return "af-user-1";
    });
    client.collectDeviceIdentifiers.mockImplementation(async () => {
      calls.push("collect-device-identifiers");
    });
    client.setAppsflyerID.mockImplementation(async () => {
      calls.push("set-appsflyer-id");
    });
    client.purchasePackage.mockImplementation(async () => {
      calls.push("purchase");
      return {
        productIdentifier: "leanient_annual",
        customerInfo,
      };
    });
    const service = createRevenueCatService({
      iosApiKey: "ios_key",
      platform: "ios",
      purchasesClient: client,
      getAppsFlyerId,
    });

    await service.purchasePlan({ planId: "annual", appUserId: "user_1" });

    expect(getAppsFlyerId).toHaveBeenCalledWith("user_1");
    expect(client.collectDeviceIdentifiers).toHaveBeenCalledTimes(2);
    expect(client.setAppsflyerID).toHaveBeenCalledWith("af-user-1");
    expect(calls).toEqual([
      "read-appsflyer-id",
      "collect-device-identifiers",
      "set-appsflyer-id",
      "read-appsflyer-id",
      "collect-device-identifiers",
      "set-appsflyer-id",
      "purchase",
    ]);
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
