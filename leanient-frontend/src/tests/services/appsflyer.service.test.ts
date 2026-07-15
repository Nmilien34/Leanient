import { describe, expect, it, vi } from "vitest";
import { createAppsFlyerService } from "../../services/appsflyer.service";

function makeClient() {
  let appsFlyerUID: string | undefined = "af-user-1";
  let conversionDataListener: ((result: unknown) => void) | undefined;
  return {
    client: {
      initSdk: vi.fn((_: unknown, success: (result: string) => void) => success("initialized")),
      startSdk: vi.fn(),
      setCustomerUserId: vi.fn((_: string, callback?: (result: string) => void) => callback?.("ok")),
      logEvent: vi.fn(
        (_eventName: string, _eventValues: Record<string, string>, success: (result: string) => void) =>
          success("ok"),
      ),
      getAppsFlyerUID: vi.fn((callback: (error: unknown, uid?: string) => void) =>
        callback(null, appsFlyerUID),
      ),
      onInstallConversionData: vi.fn((listener: (result: unknown) => void) => {
        conversionDataListener = listener;
        return vi.fn();
      }),
    },
    emitConversionData: () => conversionDataListener?.({ type: "onInstallConversionDataLoaded" }),
    setAppsFlyerUID: (nextAppsFlyerUID: string | undefined) => {
      appsFlyerUID = nextAppsFlyerUID;
    },
  };
}

describe("AppsFlyer service", () => {
  it("initializes with ATT, CUID, manual start, and no native conversion listener", async () => {
    vi.useFakeTimers();
    const { client } = makeClient();
    const requestTrackingPermissions = vi.fn().mockResolvedValue({ status: "granted" });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const service = createAppsFlyerService({
      appId: "6778920696",
      devKey: "dev-key",
      platform: "ios",
      isDev: true,
      appsFlyerClient: client,
      requestTrackingPermissions,
      isTrackingTransparencyAvailable: () => true,
    });

    await expect(service.initialize("user_1")).resolves.toBe(true);
    await Promise.resolve();

    expect(client.logEvent).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.logEvent).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(requestTrackingPermissions).toHaveBeenCalledTimes(1);
    expect(client.setCustomerUserId).toHaveBeenCalledWith("user_1", expect.any(Function));
    const initOptions = client.initSdk.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(initOptions).toEqual(
      expect.objectContaining({
        appId: "6778920696",
        devKey: "dev-key",
        isDebug: true,
        manualStart: true,
        onInstallConversionDataListener: false,
      }),
    );
    expect(initOptions).not.toHaveProperty("timeToWaitForATTUserAuthorization");
    expect(client.initSdk).toHaveBeenCalledWith(initOptions, expect.any(Function), expect.any(Function));
    expect(client.onInstallConversionData).not.toHaveBeenCalled();
    expect(client.startSdk).toHaveBeenCalledTimes(1);
    expect(client.setCustomerUserId.mock.invocationCallOrder[0]).toBeLessThan(
      client.startSdk.mock.invocationCallOrder[0],
    );
    consoleLog.mockRestore();
    vi.useRealTimers();
  });

  it("is a safe no-op when AppsFlyer config is missing", async () => {
    const { client } = makeClient();
    const service = createAppsFlyerService({
      appId: "",
      devKey: "",
      platform: "ios",
      appsFlyerClient: client,
    });

    await expect(service.initialize("user_1")).resolves.toBe(false);

    expect(client.initSdk).not.toHaveBeenCalled();
    expect(client.startSdk).not.toHaveBeenCalled();
  });

  it("logs the confirmed first-time registration event without revenue values", async () => {
    const { client } = makeClient();
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const service = createAppsFlyerService({
      appId: "6778920696",
      devKey: "dev-key",
      platform: "ios",
      isDev: false,
      appsFlyerClient: client,
    });

    await service.logCompleteRegistration({ method: "google" });

    expect(client.logEvent).toHaveBeenCalledWith(
      "af_complete_registration",
      { af_registration_method: "google" },
      expect.any(Function),
      expect.any(Function),
    );
    expect(consoleInfo).not.toHaveBeenCalled();
    consoleInfo.mockRestore();
  });

  it("warns in dev when registration cannot be logged because config is missing", async () => {
    const { client } = makeClient();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = createAppsFlyerService({
      appId: "",
      devKey: "",
      platform: "ios",
      isDev: true,
      appsFlyerClient: client,
    });

    await service.logCompleteRegistration({ method: "google" });

    expect(client.logEvent).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining("af_complete_registration"));
    consoleWarn.mockRestore();
  });

  it("reads the AppsFlyer ID for RevenueCat attribution", async () => {
    const { client } = makeClient();
    const service = createAppsFlyerService({
      appId: "6778920696",
      devKey: "dev-key",
      platform: "ios",
      isDev: false,
      appsFlyerClient: client,
    });

    await expect(service.getAppsFlyerUID()).resolves.toBe("af-user-1");
  });

  it("notifies listeners when the AppsFlyer ID becomes available after startup retry", async () => {
    vi.useFakeTimers();
    const native = makeClient();
    native.setAppsFlyerUID(undefined);
    const listener = vi.fn();
    const service = createAppsFlyerService({
      appId: "6778920696",
      devKey: "dev-key",
      platform: "ios",
      isDev: false,
      appsFlyerClient: native.client,
      requestTrackingPermissions: vi.fn().mockResolvedValue({ status: "granted" }),
    });

    service.onAppsFlyerUIDAvailable(listener);
    await service.initialize();
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    expect(native.client.onInstallConversionData).not.toHaveBeenCalled();

    native.setAppsFlyerUID("af-user-1");
    await vi.advanceTimersByTimeAsync(250);
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith("af-user-1");
    vi.useRealTimers();
  });
});
