import { Platform } from "react-native";
import type {
  CustomerInfo,
  MakePurchaseResult,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import type { SubscriptionStatus, User } from "@leanient/shared";
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from "../config";
import appsFlyerService from "./appsflyer.service";

export type RevenueCatPlanId = "annual" | "monthly";

export type RevenueCatPurchaseResult =
  | { status: "purchased"; customerInfo: CustomerInfo }
  | { status: "cancelled" };

interface RevenueCatNativeClient {
  configure(config: { apiKey: string; appUserID?: string | null }): void;
  logIn(appUserID: string): Promise<unknown>;
  logOut(): Promise<CustomerInfo>;
  setDebugLogsEnabled?(enabled: boolean): void;
  setLogLevel?(logLevel: string): void;
  LOG_LEVEL?: {
    DEBUG?: string;
    WARN?: string;
    ERROR?: string;
  };
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
  syncPurchases(): Promise<void>;
  collectDeviceIdentifiers(): Promise<void>;
  setAppsflyerID(appsflyerID: string | null): Promise<void>;
  PURCHASES_ERROR_CODE?: {
    PURCHASE_CANCELLED_ERROR?: string;
  };
}

interface RevenueCatServiceOptions {
  iosApiKey?: string;
  androidApiKey?: string;
  platform?: "ios" | "android" | "web" | string;
  purchasesClient?: RevenueCatNativeClient;
  loadPurchasesClient?: () => Promise<RevenueCatNativeClient>;
  getAppsFlyerId?: (appUserId?: string) => Promise<string | undefined>;
  onAppsFlyerIdAvailable?: (listener: (appsFlyerId: string) => void) => () => void;
}

async function loadNativePurchasesClient(): Promise<RevenueCatNativeClient> {
  const purchasesModule = await import("react-native-purchases");
  return purchasesModule.default;
}

function isPurchaseCancelled(error: unknown, client?: RevenueCatNativeClient): boolean {
  const candidate = error as { code?: string; userCancelled?: boolean | null };
  return (
    candidate.userCancelled === true ||
    candidate.code === "1" ||
    candidate.code === client?.PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR
  );
}

function warnInDev(message: string, error?: unknown): void {
  if (!isDevRuntime()) return;
  console.warn(message, error);
}

function attributionDebugLog(message: string, ...args: unknown[]): void {
  if (!isDevRuntime()) return;
  console.log(`[Attribution Debug][temporary] ${message}`, ...args);
}

function isDevRuntime(): boolean {
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return typeof devFlag === "boolean" ? devFlag : process.env.NODE_ENV !== "production";
}

function configureRevenueCatLogLevel(client: RevenueCatNativeClient): void {
  const isDev = isDevRuntime();

  if (client.setLogLevel && client.LOG_LEVEL) {
    const logLevel = isDev
      ? client.LOG_LEVEL.DEBUG
      : client.LOG_LEVEL.WARN ?? client.LOG_LEVEL.ERROR;
    if (logLevel) {
      client.setLogLevel(logLevel);
      return;
    }
  }

  client.setDebugLogsEnabled?.(isDev);
}

function getPackageForPlan(
  offerings: PurchasesOfferings,
  planId: RevenueCatPlanId,
): PurchasesPackage {
  const offering = offerings.current;
  if (!offering) {
    throw new Error("No RevenueCat offering is configured.");
  }

  const configuredPackage = planId === "annual" ? offering.annual : offering.monthly;
  const fallbackPackage = offering.availablePackages.find((pkg) =>
    pkg.identifier.toLowerCase().includes(planId),
  );
  const selectedPackage = configuredPackage ?? fallbackPackage;

  if (!selectedPackage) {
    throw new Error(`No RevenueCat ${planId} package is configured.`);
  }

  return selectedPackage;
}

function activeEntitlementFromCustomerInfo(customerInfo: CustomerInfo) {
  return Object.values(customerInfo.entitlements.active).find((entitlement) => entitlement.isActive);
}

/** Whether this customer currently holds any active entitlement (restore path). */
export function hasActiveEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(activeEntitlementFromCustomerInfo(customerInfo));
}

function statusFromEntitlement(entitlement: ReturnType<typeof activeEntitlementFromCustomerInfo>): SubscriptionStatus {
  if (!entitlement) return "free";
  if (!entitlement.willRenew && entitlement.expirationDate) return "active_canceled";
  return entitlement.periodType.toUpperCase() === "TRIAL" ? "trialing" : "active";
}

export function applyRevenueCatCustomerInfoToUser(user: User, customerInfo: CustomerInfo): User {
  const entitlement = activeEntitlementFromCustomerInfo(customerInfo);
  if (!entitlement) return user;

  return {
    ...user,
    subscriptionStatus: statusFromEntitlement(entitlement),
    entitlementExpiresAt: entitlement.expirationDate ?? undefined,
    subscriptionWillRenew: entitlement.willRenew,
    revenueCatCustomerId: customerInfo.originalAppUserId,
    revenueCatEntitlement: entitlement.identifier,
  };
}

export class RevenueCatService {
  private readonly iosApiKey?: string;
  private readonly androidApiKey?: string;
  private readonly platform: string;
  private readonly loadPurchasesClient: () => Promise<RevenueCatNativeClient>;
  private readonly getAppsFlyerId?: (appUserId?: string) => Promise<string | undefined>;
  private readonly onAppsFlyerIdAvailable?: (listener: (appsFlyerId: string) => void) => () => void;
  private unsubscribeAppsFlyerIdAvailable?: () => void;
  private client?: RevenueCatNativeClient;
  private isConfigured = false;
  private configuredAppUserId?: string | null;

  public constructor(options: RevenueCatServiceOptions = {}) {
    this.iosApiKey = options.iosApiKey;
    this.androidApiKey = options.androidApiKey;
    this.platform = options.platform ?? Platform.OS;
    this.client = options.purchasesClient;
    this.loadPurchasesClient = options.loadPurchasesClient ?? loadNativePurchasesClient;
    this.getAppsFlyerId = options.getAppsFlyerId;
    this.onAppsFlyerIdAvailable = options.onAppsFlyerIdAvailable;
    this.subscribeToAppsFlyerIdAvailability();
  }

  private getApiKey(): string | undefined {
    if (this.platform === "ios") return this.iosApiKey;
    if (this.platform === "android") return this.androidApiKey;
    return undefined;
  }

  private async getClient(): Promise<RevenueCatNativeClient> {
    if (!this.client) {
      this.client = await this.loadPurchasesClient();
      configureRevenueCatLogLevel(this.client);
    }
    return this.client;
  }

  private subscribeToAppsFlyerIdAvailability(): void {
    if (!this.onAppsFlyerIdAvailable || this.unsubscribeAppsFlyerIdAvailable) {
      return;
    }

    this.unsubscribeAppsFlyerIdAvailable = this.onAppsFlyerIdAvailable((appsFlyerId) => {
      void this.syncAppsFlyerAttribution(appsFlyerId).catch((error) => {
        warnInDev("[RevenueCat] Could not sync AppsFlyer attribution after AppsFlyer ID became available.", error);
      });
    });
  }

  public async configure(appUserId?: string): Promise<boolean> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      this.isConfigured = false;
      return false;
    }

    const client = await this.getClient();
    if (!this.isConfigured) {
      client.configure({
        apiKey,
        appUserID: appUserId ?? null,
      });
      this.configuredAppUserId = appUserId ?? null;
    } else if (appUserId && appUserId !== this.configuredAppUserId) {
      await client.logIn(appUserId);
      this.configuredAppUserId = appUserId;
    }

    this.isConfigured = true;
    await this.syncAppsFlyerAttributionFromCurrentSdk(appUserId);
    return true;
  }

  public isRevenueCatConfigured(): boolean {
    return this.isConfigured;
  }

  private async requireConfigured(appUserId?: string): Promise<RevenueCatNativeClient> {
    const configured = await this.configure(appUserId);
    if (!configured) {
      throw new Error("Purchases are not configured on this build.");
    }

    return this.getClient();
  }

  public async syncSubscriptionStatus(appUserId?: string): Promise<CustomerInfo | undefined> {
    if (!appUserId) {
      return undefined;
    }

    const configured = await this.configure(appUserId);
    if (!configured) return undefined;

    const client = await this.getClient();
    await client.syncPurchases();
    return client.getCustomerInfo();
  }

  public async syncAppsFlyerAttribution(appsFlyerId?: string | null): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    const client = await this.getClient();
    await client.collectDeviceIdentifiers();
    attributionDebugLog("RevenueCat collected device identifiers.");
    if (appsFlyerId) {
      await client.setAppsflyerID(appsFlyerId);
      attributionDebugLog("RevenueCat set $appsflyerId:", appsFlyerId);
    }
  }

  private async syncAppsFlyerAttributionFromCurrentSdk(appUserId?: string): Promise<void> {
    if (!this.getAppsFlyerId) {
      return;
    }

    let appsFlyerId: string | undefined;
    try {
      appsFlyerId = await this.getAppsFlyerId(appUserId);
    } catch (error) {
      warnInDev("[RevenueCat] Could not read AppsFlyer ID before purchase.", error);
    }

    try {
      await this.syncAppsFlyerAttribution(appsFlyerId);
    } catch (error) {
      warnInDev("[RevenueCat] Could not sync AppsFlyer attribution.", error);
    }
  }

  private async syncAppsFlyerAttributionBeforePurchase(appUserId?: string): Promise<void> {
    await this.syncAppsFlyerAttributionFromCurrentSdk(appUserId);
  }

  public async purchasePlan({
    planId,
    appUserId,
  }: {
    planId: RevenueCatPlanId;
    appUserId?: string;
  }): Promise<RevenueCatPurchaseResult> {
    const client = await this.requireConfigured(appUserId);
    await this.syncAppsFlyerAttributionBeforePurchase(appUserId);
    const selectedPackage = getPackageForPlan(await client.getOfferings(), planId);

    try {
      const result = await client.purchasePackage(selectedPackage);
      return {
        status: "purchased",
        customerInfo: result.customerInfo,
      };
    } catch (error) {
      if (isPurchaseCancelled(error, client)) {
        return { status: "cancelled" };
      }

      throw error;
    }
  }

  public async restorePurchases(appUserId?: string): Promise<CustomerInfo> {
    if (!appUserId) {
      throw new Error("RevenueCat restore requires an authenticated user.");
    }

    const client = await this.requireConfigured(appUserId);
    return client.restorePurchases();
  }

  public async logOut(): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    const client = await this.getClient();
    await client.logOut();
    this.configuredAppUserId = null;
  }
}

export function createRevenueCatService(options: RevenueCatServiceOptions = {}): RevenueCatService {
  return new RevenueCatService(options);
}

async function getAppsFlyerIdForRevenueCat(appUserId?: string): Promise<string | undefined> {
  const initialized = await appsFlyerService.initialize(appUserId).catch((error) => {
    warnInDev("[RevenueCat] Could not initialize AppsFlyer before purchase.", error);
    return false;
  });
  if (!initialized) return undefined;

  return appsFlyerService.getAppsFlyerUID().catch((error) => {
    warnInDev("[RevenueCat] Could not read AppsFlyer ID before purchase.", error);
    return undefined;
  });
}

const revenueCatService = createRevenueCatService({
  iosApiKey: REVENUECAT_IOS_API_KEY,
  androidApiKey: REVENUECAT_ANDROID_API_KEY,
  getAppsFlyerId: getAppsFlyerIdForRevenueCat,
  onAppsFlyerIdAvailable: (listener) => appsFlyerService.onAppsFlyerUIDAvailable(listener),
});

export default revenueCatService;
