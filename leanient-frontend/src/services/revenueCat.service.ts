import { Platform } from "react-native";
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from "../config";

interface RevenueCatServiceOptions {
  iosApiKey?: string;
  androidApiKey?: string;
  platform?: "ios" | "android" | "web" | string;
}

export class RevenueCatService {
  private readonly iosApiKey?: string;
  private readonly androidApiKey?: string;
  private readonly platform: string;
  private isConfigured = false;

  public constructor(options: RevenueCatServiceOptions = {}) {
    this.iosApiKey = options.iosApiKey;
    this.androidApiKey = options.androidApiKey;
    this.platform = options.platform ?? Platform.OS;
  }

  public async configure(): Promise<boolean> {
    const apiKey = this.platform === "ios" ? this.iosApiKey : this.androidApiKey;

    if (!apiKey) {
      this.isConfigured = false;
      return false;
    }

    this.isConfigured = true;
    return true;
  }

  public isRevenueCatConfigured(): boolean {
    return this.isConfigured;
  }

  public async syncSubscriptionStatus(): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    // Native RevenueCat SDK sync will live here when paywall work starts.
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
