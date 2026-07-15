import type { SubscriptionStatus } from "@leanient/shared";
import { AuthError, ValidationError } from "../lib/errors";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { SubscriptionEventModel } from "../models/subscriptionEvent.model";
import type { UserDocument } from "../models/user.model";
import {
  applyRevenueCatAppUserIdsToUser,
  findUserByAnyRcId,
} from "./user.service";

export interface RevenueCatEvent {
  id?: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
  transaction_id?: string;
  product_id?: string;
  entitlement_id?: string;
  period_type?: string;
  expiration_at_ms?: number;
  cancel_reason?: string;
  is_trial_conversion?: boolean;
}

export interface RevenueCatWebhookPayload {
  event?: RevenueCatEvent;
}

interface MongoDuplicateKeyError {
  code?: number;
  keyPattern?: Record<string, unknown>;
}

export interface MappedSubscription {
  status: SubscriptionStatus;
  entitlementExpiresAt?: string;
  subscriptionWillRenew: boolean;
}

function dateFromMs(value?: number): string | undefined {
  return typeof value === "number" ? new Date(value).toISOString() : undefined;
}

export function mapRevenueCatEventToSubscription(event: RevenueCatEvent): MappedSubscription {
  const entitlementExpiresAt = dateFromMs(event.expiration_at_ms);

  if (event.type === "BILLING_ISSUE") {
    return { status: "past_due", entitlementExpiresAt, subscriptionWillRenew: false };
  }

  if (event.type === "REFUND") {
    return { status: "refunded", entitlementExpiresAt, subscriptionWillRenew: false };
  }

  if (event.type === "EXPIRATION") {
    return { status: "canceled", entitlementExpiresAt, subscriptionWillRenew: false };
  }

  if (event.type === "CANCELLATION") {
    return {
      status: entitlementExpiresAt ? "active_canceled" : "canceled",
      entitlementExpiresAt,
      subscriptionWillRenew: false,
    };
  }

  if (event.type === "INITIAL_PURCHASE" && event.period_type === "TRIAL") {
    return { status: "trialing", entitlementExpiresAt, subscriptionWillRenew: true };
  }

  if (["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(event.type)) {
    return { status: "active", entitlementExpiresAt, subscriptionWillRenew: true };
  }

  return { status: "free", entitlementExpiresAt, subscriptionWillRenew: false };
}

export function assertRevenueCatWebhookAuthorization(authHeader?: string): void {
  if (!env.revenueCat.webhookSecret) {
    return;
  }

  if (authHeader !== `Bearer ${env.revenueCat.webhookSecret}`) {
    throw new AuthError("Invalid RevenueCat webhook secret");
  }
}

function isRevenueCatEventDuplicateKeyError(error: unknown): boolean {
  const candidate = error as MongoDuplicateKeyError;
  return candidate.code === 11000 && Boolean(candidate.keyPattern?.revenueCatEventId);
}

function uniqueNonEmptyStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function revenueCatEventKey(event: RevenueCatEvent): string | undefined {
  return event.id ?? (event.transaction_id ? `${event.transaction_id}:${event.type}` : undefined);
}

function revenueCatEventCustomerId(event: RevenueCatEvent): string | undefined {
  return uniqueNonEmptyStrings([
    event.app_user_id,
    event.original_app_user_id,
    ...(event.transferred_to ?? []),
    ...(event.transferred_from ?? []),
    ...(event.aliases ?? []),
  ])[0];
}

function revenueCatLookupCandidates(event: RevenueCatEvent): string[] {
  if (event.type === "TRANSFER") {
    return uniqueNonEmptyStrings([
      ...(event.transferred_to ?? []),
      ...(event.transferred_from ?? []),
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
    ]);
  }

  return uniqueNonEmptyStrings([
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ]);
}

function revenueCatIdsToAssociate(event: RevenueCatEvent): string[] {
  return uniqueNonEmptyStrings([
    event.app_user_id,
    event.original_app_user_id,
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
    ...(event.aliases ?? []),
  ]);
}

function primaryRevenueCatId(event: RevenueCatEvent): string | undefined {
  if (event.type === "TRANSFER") {
    return uniqueNonEmptyStrings([
      ...(event.transferred_to ?? []),
      event.app_user_id,
      event.original_app_user_id,
    ])[0];
  }

  return uniqueNonEmptyStrings([event.app_user_id, event.original_app_user_id])[0];
}

async function recordRevenueCatEvent(
  event: RevenueCatEvent,
  mapped: MappedSubscription,
  user?: UserDocument,
): Promise<boolean> {
  try {
    await SubscriptionEventModel.create({
      userId: user?._id,
      revenueCatEventId: revenueCatEventKey(event),
      revenueCatCustomerId: revenueCatEventCustomerId(event),
      eventType: event.type,
      productId: event.product_id,
      entitlementId: event.entitlement_id,
      status: mapped.status,
      rawEvent: event,
      receivedAt: new Date(),
    });
    return false;
  } catch (error) {
    if (isRevenueCatEventDuplicateKeyError(error)) {
      logger.info(
        {
          eventId: revenueCatEventKey(event),
          userId: user?._id.toString(),
        },
        "[revenuecat] duplicate webhook ignored",
      );

      return true;
    }

    throw error;
  }
}

export async function handleRevenueCatWebhook(payload: RevenueCatWebhookPayload) {
  if (!payload.event) {
    throw new ValidationError("RevenueCat webhook payload is missing event");
  }

  const event = payload.event;
  const candidates = revenueCatLookupCandidates(event);
  const user = await findUserByAnyRcId(candidates);
  const mapped =
    event.type === "TRANSFER" && user
      ? {
          status: user.subscriptionStatus,
          entitlementExpiresAt: user.entitlementExpiresAt?.toISOString(),
          subscriptionWillRenew: user.subscriptionWillRenew,
        }
      : mapRevenueCatEventToSubscription(event);

  if (!user) {
    const alreadyProcessed = await recordRevenueCatEvent(event, mapped);
    if (!alreadyProcessed) {
      logger.warn(
        {
          eventId: revenueCatEventKey(event),
          eventType: event.type,
          candidateRevenueCatIds: candidates,
        },
        "[revenuecat] webhook user not found; acknowledged without retry",
      );
    }

    return {
      status: mapped.status,
      userId: undefined,
      alreadyProcessed,
      ignored: true,
    };
  }

  const alreadyProcessed = await recordRevenueCatEvent(event, mapped, user);
  if (alreadyProcessed) {
    return {
      status: mapped.status,
      userId: user._id.toString(),
      alreadyProcessed: true,
    };
  }

  applyRevenueCatAppUserIdsToUser(user, revenueCatIdsToAssociate(event), primaryRevenueCatId(event));

  if (event.type !== "TRANSFER") {
    user.subscriptionStatus = mapped.status;
    user.entitlementExpiresAt = mapped.entitlementExpiresAt
      ? new Date(mapped.entitlementExpiresAt)
      : undefined;
    user.subscriptionWillRenew = mapped.subscriptionWillRenew;
    user.revenueCatEntitlement = event.entitlement_id;
  }

  await user.save();

  return {
    status: mapped.status,
    userId: user._id.toString(),
    alreadyProcessed: false,
  };
}
