import { Platform } from "react-native";
import type {
  CustomerInfo,
  MakePurchaseResult,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import type { SubscriptionStatus, User } from "@leanient/shared";
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from "../config";

export type RevenueCatPlanId = "annual" | "monthly";

export type RevenueCatPurchaseResult =
  | { status: "purchased"; customerInfo: CustomerInfo }
  | { status: "cancelled" };

interface RevenueCatNativeClient {
  configure(config: { apiKey: string; appUserID?: string }): void;
  logIn(appUserID: string): Promise<unknown>;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
  syncPurchases(): Promise<void>;
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
  private client?: RevenueCatNativeClient;
  private isConfigured = false;
  private configuredAppUserId?: string;

  public constructor(options: RevenueCatServiceOptions = {}) {
    this.iosApiKey = options.iosApiKey;
    this.androidApiKey = options.androidApiKey;
    this.platform = options.platform ?? Platform.OS;
    this.client = options.purchasesClient;
    this.loadPurchasesClient = options.loadPurchasesClient ?? loadNativePurchasesClient;
  }

  private getApiKey(): string | undefined {
    if (this.platform === "ios") return this.iosApiKey;
    if (this.platform === "android") return this.androidApiKey;
    return undefined;
  }

  private async getClient(): Promise<RevenueCatNativeClient> {
    if (!this.client) {
      this.client = await this.loadPurchasesClient();
    }
    return this.client;
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
        appUserID: appUserId,
      });
      this.configuredAppUserId = appUserId;
    } else if (appUserId && appUserId !== this.configuredAppUserId) {
      await client.logIn(appUserId);
      this.configuredAppUserId = appUserId;
    }

    this.isConfigured = true;
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
    const configured = await this.configure(appUserId);
    if (!configured) return undefined;

    const client = await this.getClient();
    await client.syncPurchases();
    return client.getCustomerInfo();
  }

  public async purchasePlan({
    planId,
    appUserId,
  }: {
    planId: RevenueCatPlanId;
    appUserId?: string;
  }): Promise<RevenueCatPurchaseResult> {
    const client = await this.requireConfigured(appUserId);
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
    const client = await this.requireConfigured(appUserId);
    return client.restorePurchases();
  }
}

export function createRevenueCatService(options: RevenueCatServiceOptions = {}): RevenueCatService {
  return new RevenueCatService(options);
}

const revenueCatService = createRevenueCatService({
  iosApiKey: REVENUECAT_IOS_API_KEY,
  androidApiKey: REVENUECAT_ANDROID_API_KEY,
});

export default revenueCatService;
