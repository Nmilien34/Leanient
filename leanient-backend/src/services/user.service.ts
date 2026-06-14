import { ERROR_CODES, type AuthProvider, type User as SharedUser } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { UserModel, type UserDocument } from "../models/user.model";
import type { ProviderIdentity } from "../auth/identity";

function normalizeEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function hasProvider(user: UserDocument, provider: AuthProvider, providerUserId: string): boolean {
  return user.authProviders.some(
    (authProvider) =>
      authProvider.provider === provider && authProvider.providerUserId === providerUserId,
  );
}

function findProvider(
  user: UserDocument,
  provider: AuthProvider,
  providerUserId: string,
): UserDocument["authProviders"][number] | undefined {
  return user.authProviders.find(
    (authProvider) =>
      authProvider.provider === provider && authProvider.providerUserId === providerUserId,
  );
}

function applyIdentityToUser(user: UserDocument, identity: ProviderIdentity): void {
  const email = normalizeEmail(identity.email);
  const provider = findProvider(user, identity.provider, identity.providerUserId);

  if (email && !user.email) {
    user.email = email;
    user.emailVerified = identity.emailVerified === true;
  }

  if (email && user.email === email && identity.emailVerified) {
    user.emailVerified = true;
  }

  if (identity.name && user.displayName !== identity.name) {
    user.displayName = identity.name;
  }

  if (identity.picture && user.avatarUrl !== identity.picture) {
    user.avatarUrl = identity.picture;
  }

  if (provider) {
    provider.linkedAt = new Date();
  } else if (!hasProvider(user, identity.provider, identity.providerUserId)) {
    user.authProviders.push({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      linkedAt: new Date(),
    });
  }
}

function applyLinkedIdentityToUser(user: UserDocument, identity: ProviderIdentity): void {
  const email = normalizeEmail(identity.email);
  const provider = findProvider(user, identity.provider, identity.providerUserId);

  if (email && !user.email) {
    user.email = email;
    user.emailVerified = identity.emailVerified === true;
  }

  if (email && user.email === email && identity.emailVerified) {
    user.emailVerified = true;
  }

  if (!user.displayName && identity.name) {
    user.displayName = identity.name;
  }

  if (!user.avatarUrl && identity.picture) {
    user.avatarUrl = identity.picture;
  }

  if (provider) {
    provider.linkedAt = new Date();
  } else {
    user.authProviders.push({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      linkedAt: new Date(),
    });
  }
}

function providerConflict(message: string): AppError {
  return new AppError({
    code: ERROR_CODES.conflict,
    message,
    statusCode: 409,
  });
}

export function serializeUser(user: UserDocument): SharedUser {
  return {
    id: user._id.toString(),
    email: user.email,
    emailVerified: user.emailVerified,
    onboardingComplete: user.onboardingComplete,
    authProviders: user.authProviders.map((authProvider) => ({
      provider: authProvider.provider,
      providerUserId: authProvider.providerUserId,
      linkedAt: authProvider.linkedAt.toISOString(),
    })),
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    hasAvatar: Boolean(user.avatarKey),
    subscriptionStatus: user.subscriptionStatus,
    entitlementExpiresAt: user.entitlementExpiresAt?.toISOString(),
    subscriptionWillRenew: user.subscriptionWillRenew,
    revenueCatCustomerId: user.revenueCatCustomerId,
    revenueCatEntitlement: user.revenueCatEntitlement,
    faceAnalysisConsentAt: user.faceAnalysisConsentAt?.toISOString() ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function upsertUserFromIdentity(identity: ProviderIdentity): Promise<UserDocument> {
  const existingByProvider = await UserModel.findOne({
    authProviders: {
      $elemMatch: {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      },
    },
  });

  if (existingByProvider) {
    applyIdentityToUser(existingByProvider, identity);
    await existingByProvider.save();
    return existingByProvider;
  }

  const email = normalizeEmail(identity.email);
  const emailIsVerified = identity.emailVerified === true;
  const existingByEmail =
    email && emailIsVerified ? await UserModel.findOne({ email, emailVerified: true }) : null;

  if (existingByEmail) {
    applyIdentityToUser(existingByEmail, identity);
    await existingByEmail.save();
    return existingByEmail;
  }

  // TODO: Add an explicit email verification flow for users created from
  // providers that return unverified email claims.
  const user = new UserModel({
    email,
    emailVerified: emailIsVerified,
    authProviders: [
      {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        linkedAt: new Date(),
      },
    ],
    displayName: identity.name,
    avatarUrl: identity.picture,
  });

  await user.save();
  return user;
}

export async function linkProviderIdentityToUser(
  userId: string,
  identity: ProviderIdentity,
): Promise<UserDocument> {
  const existingByProvider = await UserModel.findOne({
    authProviders: {
      $elemMatch: {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      },
    },
  });

  if (existingByProvider && existingByProvider._id.toString() !== userId) {
    throw providerConflict("This sign-in method is already linked to another Leanient account.");
  }

  const user = existingByProvider ?? (await getUserById(userId));
  const hasDifferentIdentityForProvider = user.authProviders.some(
    (authProvider) =>
      authProvider.provider === identity.provider &&
      authProvider.providerUserId !== identity.providerUserId,
  );

  if (hasDifferentIdentityForProvider) {
    throw providerConflict("This account already has that sign-in provider linked.");
  }

  applyLinkedIdentityToUser(user, identity);
  await user.save();
  return user;
}

export async function getUserById(userId: string): Promise<UserDocument> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  patch: {
    displayName?: string;
    avatarUrl?: string;
  },
): Promise<UserDocument> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: patch,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}

/**
 * Record (or revoke) consent for on-device facial-volume analysis. Granting
 * stamps the time so we hold a real consent record; revoking clears it. The
 * `now` arg keeps the timestamp deterministic in tests.
 */
export async function setFaceAnalysisConsent(
  userId: string,
  granted: boolean,
  now = new Date(),
): Promise<UserDocument> {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { faceAnalysisConsentAt: granted ? now : null } },
    { new: true, runValidators: true },
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
}
