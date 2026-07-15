import { Platform } from "react-native";
import { APPSFLYER_APP_ID, APPSFLYER_DEV_KEY } from "../config";

type AppsFlyerMethod = "apple" | "demo" | "google";

interface AppsFlyerInitOptions {
  devKey: string;
  appId?: string;
  isDebug?: boolean;
  onInstallConversionDataListener?: boolean;
  onDeepLinkListener?: boolean;
  timeToWaitForATTUserAuthorization?: number;
  manualStart?: boolean;
}

type AppsFlyerSuccessCallback = (result?: unknown) => unknown;
type AppsFlyerErrorCallback = (error?: unknown) => unknown;
type AppsFlyerUIDListener = (uid: string) => void;
type AppsFlyerUnsubscribe = () => void;

const APPSFLYER_UID_RETRY_DELAYS_MS = [250, 1_000, 3_000];

export interface AppsFlyerNativeClient {
  initSdk(
    options: AppsFlyerInitOptions,
    success?: AppsFlyerSuccessCallback,
    error?: AppsFlyerErrorCallback,
  ): void | Promise<string>;
  startSdk(): void;
  setCustomerUserId(userId: string, success?: AppsFlyerSuccessCallback): void;
  logEvent(
    eventName: string,
    eventValues: Record<string, string>,
    success?: AppsFlyerSuccessCallback,
    error?: AppsFlyerErrorCallback,
  ): void | Promise<string>;
  getAppsFlyerUID(callback: (error: unknown, uid?: string) => unknown): void;
  onInstallConversionData?(callback: (result: unknown) => unknown): AppsFlyerUnsubscribe;
}

interface TrackingPermissionResponse {
  status?: string;
  granted?: boolean;
}

interface AppsFlyerServiceOptions {
  appId?: string;
  devKey?: string;
  platform?: "android" | "ios" | "web" | string;
  isDev?: boolean;
  appsFlyerClient?: AppsFlyerNativeClient;
  loadAppsFlyerClient?: () => Promise<AppsFlyerNativeClient>;
  requestTrackingPermissions?: () => Promise<TrackingPermissionResponse>;
  isTrackingTransparencyAvailable?: () => boolean;
}

interface CompleteRegistrationInput {
  method: AppsFlyerMethod;
}

async function loadNativeAppsFlyerClient(): Promise<AppsFlyerNativeClient> {
  const appsFlyerModule = await import("react-native-appsflyer");
  return appsFlyerModule.default;
}

async function requestNativeTrackingPermission(): Promise<TrackingPermissionResponse> {
  const trackingTransparency = await import("expo-tracking-transparency");
  if (!trackingTransparency.isAvailable()) {
    return { status: "unavailable", granted: false };
  }

  return trackingTransparency.requestTrackingPermissionsAsync();
}

function isNativeTrackingTransparencyAvailable(): boolean {
  return true;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof (value as Promise<unknown>).then === "function");
}

function isDevRuntime(): boolean {
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return typeof devFlag === "boolean" ? devFlag : process.env.NODE_ENV !== "production";
}

function warnInDev(message: string, error?: unknown): void {
  if (!isDevRuntime()) return;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

function attributionDebugLog(message: string, ...args: unknown[]): void {
  if (!isDevRuntime()) return;
  console.log(`[Attribution Debug][temporary] ${message}`, ...args);
}

export class AppsFlyerService {
  private readonly appId?: string;
  private readonly devKey?: string;
  private readonly platform: string;
  private readonly isDev: boolean;
  private readonly loadAppsFlyerClient: () => Promise<AppsFlyerNativeClient>;
  private readonly requestTrackingPermissions: () => Promise<TrackingPermissionResponse>;
  private readonly isTrackingTransparencyAvailable: () => boolean;
  private client?: AppsFlyerNativeClient;
  private initialized = false;
  private lastKnownUID?: string;
  private readonly uidListeners = new Set<AppsFlyerUIDListener>();
  private uidRetryTimer?: ReturnType<typeof setTimeout>;
  private uidRetryAttempt = 0;

  public constructor(options: AppsFlyerServiceOptions = {}) {
    this.appId = options.appId;
    this.devKey = options.devKey;
    this.platform = options.platform ?? Platform.OS;
    this.isDev = options.isDev ?? process.env.NODE_ENV !== "production";
    this.client = options.appsFlyerClient;
    this.loadAppsFlyerClient = options.loadAppsFlyerClient ?? loadNativeAppsFlyerClient;
    this.requestTrackingPermissions =
      options.requestTrackingPermissions ?? requestNativeTrackingPermission;
    this.isTrackingTransparencyAvailable =
      options.isTrackingTransparencyAvailable ?? isNativeTrackingTransparencyAvailable;
  }

  private hasConfig(): boolean {
    if (!this.devKey) return false;
    if (this.platform === "ios" && !this.appId) return false;
    return true;
  }

  private async getClient(): Promise<AppsFlyerNativeClient> {
    if (!this.client) {
      this.client = await this.loadAppsFlyerClient();
    }
    return this.client;
  }

  private notifyAppsFlyerUIDAvailable(uid?: string): void {
    if (!uid) return;
    if (uid === this.lastKnownUID) return;

    if (this.isDev) {
      attributionDebugLog("AppsFlyer UID obtained:", uid);
    }
    this.lastKnownUID = uid;
    this.uidListeners.forEach((listener) => listener(uid));
  }

  private clearAppsFlyerUIDRetry(): void {
    if (this.uidRetryTimer) {
      clearTimeout(this.uidRetryTimer);
      this.uidRetryTimer = undefined;
    }
    this.uidRetryAttempt = 0;
  }

  private scheduleAppsFlyerUIDRetry(): void {
    if (this.lastKnownUID || this.uidRetryTimer) return;
    const retryDelay = APPSFLYER_UID_RETRY_DELAYS_MS[this.uidRetryAttempt];
    if (retryDelay === undefined) return;

    this.uidRetryAttempt += 1;
    this.uidRetryTimer = setTimeout(() => {
      this.uidRetryTimer = undefined;
      void this.publishCurrentAppsFlyerUID().then((uid) => {
        if (!uid) {
          this.scheduleAppsFlyerUIDRetry();
        }
      });
    }, retryDelay);
  }

  private async publishCurrentAppsFlyerUID(): Promise<string | undefined> {
    const uid = await this.getAppsFlyerUID().catch((error) => {
      warnInDev("[AppsFlyer] Could not read AppsFlyer ID.", error);
      return undefined;
    });
    if (uid) {
      this.clearAppsFlyerUIDRetry();
    }
    return uid;
  }

  private async setCustomerUserIdOnClient(
    client: AppsFlyerNativeClient,
    appUserId: string,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        client.setCustomerUserId(appUserId, () => undefined);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initSdkOnClient(
    client: AppsFlyerNativeClient,
    options: AppsFlyerInitOptions,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        const maybePromise = client.initSdk(options, () => resolve(), (error) => reject(error));
        if (isThenable(maybePromise)) {
          maybePromise.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private async requestAttIfNeeded(): Promise<void> {
    if (this.platform !== "ios" || !this.isTrackingTransparencyAvailable()) {
      return;
    }

    try {
      await this.requestTrackingPermissions();
    } catch (error) {
      warnInDev("[AppsFlyer] ATT permission request failed.", error);
    }
  }

  public async initialize(appUserId?: string): Promise<boolean> {
    if (!this.hasConfig()) {
      return false;
    }

    const client = await this.getClient();
    if (this.initialized) {
      if (appUserId) {
        await this.setCustomerUserIdOnClient(client, appUserId);
      }
      void this.publishCurrentAppsFlyerUID().then((uid) => {
        if (!uid) {
          this.scheduleAppsFlyerUIDRetry();
        }
      });
      return true;
    }

    await this.requestAttIfNeeded();

    if (appUserId) {
      await this.setCustomerUserIdOnClient(client, appUserId);
    }

    await this.initSdkOnClient(client, {
      devKey: this.devKey!,
      appId: this.appId,
      isDebug: this.isDev,
      onInstallConversionDataListener: false,
      onDeepLinkListener: false,
      manualStart: true,
    });
    if (this.isDev) {
      attributionDebugLog("AppsFlyer initSdk completed.");
    }
    client.startSdk();
    if (this.isDev) {
      attributionDebugLog("AppsFlyer startSdk called.");
    }
    this.initialized = true;
    void this.publishCurrentAppsFlyerUID().then((uid) => {
      if (!uid) {
        this.scheduleAppsFlyerUIDRetry();
      }
    });
    return true;
  }

  public async setCustomerUserId(appUserId: string): Promise<void> {
    if (!this.hasConfig()) {
      return;
    }

    await this.setCustomerUserIdOnClient(await this.getClient(), appUserId);
  }

  public async logCompleteRegistration(input: CompleteRegistrationInput): Promise<void> {
    if (!this.hasConfig()) {
      if (this.isDev) {
        console.warn("[AppsFlyer] Missing app id or dev key; skipping af_complete_registration.");
      }
      return;
    }

    const client = await this.getClient();
    await new Promise<void>((resolve, reject) => {
      try {
        const maybePromise = client.logEvent(
          "af_complete_registration",
          { af_registration_method: input.method },
          () => resolve(),
          (error) => reject(error),
        );
        if (isThenable(maybePromise)) {
          maybePromise.then(() => resolve()).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  public async getAppsFlyerUID(): Promise<string | undefined> {
    if (!this.hasConfig()) {
      return undefined;
    }

    const client = await this.getClient();
    return new Promise<string | undefined>((resolve, reject) => {
      try {
        client.getAppsFlyerUID((error, uid) => {
          if (error) {
            reject(error);
            return;
          }
          this.notifyAppsFlyerUIDAvailable(uid);
          resolve(uid);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public onAppsFlyerUIDAvailable(listener: AppsFlyerUIDListener): AppsFlyerUnsubscribe {
    this.uidListeners.add(listener);
    if (this.lastKnownUID) {
      listener(this.lastKnownUID);
    }

    return () => {
      this.uidListeners.delete(listener);
    };
  }
}

export function createAppsFlyerService(options: AppsFlyerServiceOptions = {}): AppsFlyerService {
  return new AppsFlyerService(options);
}

const appsFlyerService = createAppsFlyerService({
  appId: APPSFLYER_APP_ID,
  devKey: APPSFLYER_DEV_KEY,
});

export default appsFlyerService;
