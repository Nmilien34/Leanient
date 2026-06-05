import type { SubscriptionStatus } from "@leanient/shared";
import { AuthError, NotFoundError, ValidationError } from "../lib/errors";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { SubscriptionEventModel } from "../models/subscriptionEvent.model";
import { UserModel } from "../models/user.model";

export interface RevenueCatEvent {
  id?: string;
  type: string;
  app_user_id?: string;
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

export async function handleRevenueCatWebhook(payload: RevenueCatWebhookPayload) {
  if (!payload.event) {
    throw new ValidationError("RevenueCat webhook payload is missing event");
  }

  const event = payload.event;
  const mapped = mapRevenueCatEventToSubscription(event);
  const user = event.app_user_id ? await UserModel.findById(event.app_user_id) : null;

  if (!event.app_user_id || !user) {
    throw new NotFoundError("RevenueCat webhook user not found");
  }

  try {
    // The unique revenueCatEventId index is the idempotency gate. Insert the
    // external event before mutating user state so duplicate deliveries do no work.
    await SubscriptionEventModel.create({
      userId: user._id,
      revenueCatEventId: event.id,
      revenueCatCustomerId: event.app_user_id,
      eventType: event.type,
      productId: event.product_id,
      entitlementId: event.entitlement_id,
      status: mapped.status,
      rawEvent: event,
      receivedAt: new Date(),
    });
  } catch (error) {
    if (isRevenueCatEventDuplicateKeyError(error)) {
      logger.info(
        {
          eventId: event.id,
          userId: user._id.toString(),
        },
        "[revenuecat] duplicate webhook ignored",
      );

      return {
        status: mapped.status,
        userId: user._id.toString(),
        alreadyProcessed: true,
      };
    }

    throw error;
  }

  user.subscriptionStatus = mapped.status;
  user.entitlementExpiresAt = mapped.entitlementExpiresAt
    ? new Date(mapped.entitlementExpiresAt)
    : undefined;
  user.subscriptionWillRenew = mapped.subscriptionWillRenew;
  user.revenueCatCustomerId = event.app_user_id;
  user.revenueCatEntitlement = event.entitlement_id;
  await user.save();

  return {
    status: mapped.status,
    userId: user._id.toString(),
    alreadyProcessed: false,
  };
}
