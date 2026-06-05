import type { User } from "@leanient/shared";

/**
 * FRONTEND-ONLY view aggregate for the Subscription screen (25). The whole
 * screen is driven by `user.subscriptionStatus` + `entitlementExpiresAt` +
 * `subscriptionWillRenew`, so every state (active / trial / cancelling / past
 * due / free) reads correctly.
 *
 * Plan/price come from a constant here (the default annual offering). In
 * production the active product + price come from RevenueCat's customer info;
 * the `User` contract doesn't carry the product id, so this stands in for it.
 */

const ANNUAL = { price: "$29.99", perYear: "$29.99 / year", perMonth: "$2.50" };
const FEATURES = ["Weekly muscle verdict", "Shot-tuned workouts", "AI coach & meal scans"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface SubscriptionView {
  planLabel: string; // "INTACT · ANNUAL" | "FREE PLAN"
  priceLine: string; // "$29.99 / year" | "Not subscribed"
  statusLine: string; // "Renews Mar 3, 2027 · that's $2.50/mo"
  features: string[];
  isSubscribed: boolean; // controls the billing section + cancel link
  primaryActionLabel: string; // "Change plan" | "Upgrade to Intact" | ...
  showCancel: boolean;
}

function fmtDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function deriveSubscription(user: User): SubscriptionView {
  const status = user.subscriptionStatus;
  const date = user.entitlementExpiresAt ? fmtDate(user.entitlementExpiresAt) : null;

  switch (status) {
    case "active":
      return {
        planLabel: "INTACT · ANNUAL",
        priceLine: ANNUAL.perYear,
        statusLine: date ? `Renews ${date} · that's ${ANNUAL.perMonth}/mo` : `That's ${ANNUAL.perMonth}/mo`,
        features: FEATURES,
        isSubscribed: true,
        primaryActionLabel: "Change plan",
        showCancel: user.subscriptionWillRenew,
      };
    case "active_canceled":
      return {
        planLabel: "INTACT · ANNUAL",
        priceLine: ANNUAL.perYear,
        statusLine: date ? `Access until ${date}. Won't renew.` : "Access ending soon. Won't renew.",
        features: FEATURES,
        isSubscribed: true,
        primaryActionLabel: "Resume plan",
        showCancel: false,
      };
    case "trialing":
      return {
        planLabel: "INTACT · FREE TRIAL",
        priceLine: `Then ${ANNUAL.perYear}`,
        statusLine: date ? `Trial ends ${date}` : "You're in your free trial",
        features: FEATURES,
        isSubscribed: true,
        primaryActionLabel: "Manage plan",
        showCancel: true,
      };
    case "past_due":
      return {
        planLabel: "INTACT · ANNUAL",
        priceLine: ANNUAL.perYear,
        statusLine: "Payment failed. Update it to keep your access.",
        features: FEATURES,
        isSubscribed: true,
        primaryActionLabel: "Fix payment",
        showCancel: true,
      };
    default: // free, canceled, refunded
      return {
        planLabel: "FREE PLAN",
        priceLine: "Not subscribed",
        statusLine: "Upgrade to keep your weekly verdict and coaching.",
        features: FEATURES,
        isSubscribed: false,
        primaryActionLabel: "Upgrade to Intact",
        showCancel: false,
      };
  }
}
