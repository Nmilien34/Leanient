import type { SubscriptionStatus } from "@leanient/shared";
import type { FilterQuery } from "mongoose";
import type { UserDocument } from "../models/user.model";

const BACKGROUND_ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] satisfies SubscriptionStatus[];

export function activeUserQuery(
  additionalQuery: FilterQuery<UserDocument> = {},
): FilterQuery<UserDocument> {
  return {
    ...additionalQuery,
    onboardingComplete: true,
    subscriptionStatus: { $in: BACKGROUND_ACTIVE_SUBSCRIPTION_STATUSES },
  };
}
