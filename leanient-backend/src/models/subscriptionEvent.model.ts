import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { SubscriptionStatus } from "@leanient/shared";

export interface SubscriptionEventDocument extends Document<Types.ObjectId> {
  userId?: Types.ObjectId;
  revenueCatEventId?: string;
  revenueCatCustomerId?: string;
  eventType: string;
  productId?: string;
  entitlementId?: string;
  status: SubscriptionStatus;
  rawEvent: unknown;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionEventSchema = new Schema<SubscriptionEventDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    revenueCatEventId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    revenueCatCustomerId: {
      type: String,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productId: {
      type: String,
      trim: true,
    },
    entitlementId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["free", "trialing", "active", "active_canceled", "past_due", "canceled", "refunded"],
      required: true,
    },
    rawEvent: {
      type: Schema.Types.Mixed,
      required: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SubscriptionEventModel = mongoose.model<SubscriptionEventDocument>(
  "SubscriptionEvent",
  subscriptionEventSchema,
);
