import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { AuthProvider, SubscriptionStatus } from "@leanient/shared";

export interface LinkedAuthProviderDocument {
  provider: AuthProvider;
  providerUserId: string;
  linkedAt: Date;
}

export interface UserDocument extends Document<Types.ObjectId> {
  email?: string;
  emailVerified: boolean;
  authProviders: LinkedAuthProviderDocument[];
  displayName?: string;
  avatarUrl?: string;
  /** S3 object key for a user-uploaded avatar (private; served via presigned GET). */
  avatarKey?: string;
  subscriptionStatus: SubscriptionStatus;
  entitlementExpiresAt?: Date;
  subscriptionWillRenew: boolean;
  revenueCatCustomerId?: string;
  revenueCatEntitlement?: string;
  onboardingComplete: boolean;
  onboardingCompletedAt?: Date;
  /** When the user opted into on-device facial-volume analysis. Unset = no consent. */
  faceAnalysisConsentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const linkedAuthProviderSchema = new Schema<LinkedAuthProviderDocument>(
  {
    provider: {
      type: String,
      enum: ["google", "apple"],
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    linkedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProviders: {
      type: [linkedAuthProviderSchema],
      default: [],
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    avatarKey: {
      type: String,
      trim: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["free", "trialing", "active", "active_canceled", "past_due", "canceled", "refunded"],
      default: "free",
      index: true,
    },
    entitlementExpiresAt: {
      type: Date,
    },
    subscriptionWillRenew: {
      type: Boolean,
      default: false,
    },
    revenueCatCustomerId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    revenueCatEntitlement: {
      type: String,
      trim: true,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
    onboardingCompletedAt: {
      type: Date,
    },
    faceAnalysisConsentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    // NOTE: MongoDB forbids combining `sparse` with `partialFilterExpression`.
    // The partial filter already limits the index to docs that have an email,
    // so uniqueness is enforced only among verified-email users.
    partialFilterExpression: {
      email: { $exists: true },
      emailVerified: true,
    },
  },
);

userSchema.index(
  {
    "authProviders.provider": 1,
    "authProviders.providerUserId": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      "authProviders.provider": { $exists: true },
      "authProviders.providerUserId": { $exists: true },
    },
  },
);

export const UserModel = mongoose.model<UserDocument>("User", userSchema);
