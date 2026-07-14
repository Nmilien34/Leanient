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
type IosIdfvReader = () => Promise<string | null>;

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
  getIosIdForVendor?: IosIdfvReader;
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

async function getNativeIosIdForVendor(): Promise<string | null> {
  const application = await import("expo-application");
  return application.getIosIdForVendorAsync();
}

function isNativeTrackingTransparencyAvailable(): boolean {
  return true;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof (value as Promise<unknown>).then === "function");
}

function warnInDev(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

export class AppsFlyerService {
  private readonly appId?: string;
  private readonly devKey?: string;
  private readonly platform: string;
  private readonly isDev: boolean;
  private readonly loadAppsFlyerClient: () => Promise<AppsFlyerNativeClient>;
  private readonly requestTrackingPermissions: () => Promise<TrackingPermissionResponse>;
  private readonly isTrackingTransparencyAvailable: () => boolean;
  private readonly getIosIdForVendor: IosIdfvReader;
  private client?: AppsFlyerNativeClient;
  private initialized = false;
  private lastKnownUID?: string;
  private installConversionDataUnsubscribe?: AppsFlyerUnsubscribe;
  private readonly uidListeners = new Set<AppsFlyerUIDListener>();

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
    this.getIosIdForVendor = options.getIosIdForVendor ?? getNativeIosIdForVendor;
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

    this.lastKnownUID = uid;
    this.uidListeners.forEach((listener) => listener(uid));
  }

  private async publishCurrentAppsFlyerUID(): Promise<void> {
    await this.getAppsFlyerUID().catch((error) => {
      warnInDev("[AppsFlyer] Could not read AppsFlyer ID.", error);
      return undefined;
    });
  }

  private registerInstallConversionDataListener(client: AppsFlyerNativeClient): void {
    if (this.installConversionDataUnsubscribe || !client.onInstallConversionData) {
      return;
    }

    this.installConversionDataUnsubscribe = client.onInstallConversionData(() => {
      void this.publishCurrentAppsFlyerUID();
    });
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

  private async logDeviceIdfvInDev(): Promise<void> {
    if (!this.isDev || this.platform !== "ios") {
      return;
    }

    try {
      const idfv = await this.getIosIdForVendor();
      console.log("DEVICE_IDFV:", idfv);
    } catch (error) {
      warnInDev("[AppsFlyer] Could not read iOS IDFV.", error);
    }
  }

  public async initialize(appUserId?: string): Promise<boolean> {
    if (!this.hasConfig()) {
      return false;
    }

    await this.logDeviceIdfvInDev();

    const client = await this.getClient();
    this.registerInstallConversionDataListener(client);
    if (this.initialized) {
      if (appUserId) {
        await this.setCustomerUserIdOnClient(client, appUserId);
      }
      void this.publishCurrentAppsFlyerUID();
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
      onInstallConversionDataListener: true,
      onDeepLinkListener: false,
      timeToWaitForATTUserAuthorization: this.platform === "ios" ? 10 : undefined,
      manualStart: true,
    });
    client.startSdk();
    this.initialized = true;
    void this.publishCurrentAppsFlyerUID();
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
