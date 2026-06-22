import type { AuthResponse, User } from "@leanient/shared";
import type { AppleSignInRequest } from "@leanient/shared";
import { verifyAppleIdentityToken } from "../auth/apple";
import { verifyGoogleIdToken } from "../auth/google";
import { issueSessionJwt } from "../auth/jwt";
import { DEMO_ACCOUNT } from "../config/demoAccount";
import { UserModel } from "../models/user.model";
import { AppError, AuthError } from "../lib/errors";
import { linkProviderIdentityToUser, serializeUser, upsertUserFromIdentity } from "./user.service";

/**
 * App Store review demo login (guideline 2.1a). Verifies the fixed demo
 * credentials and returns a session for the pre-seeded demo account. Run
 * `npm run seed:demo` first so the account and its data exist.
 */
export async function signInWithReviewAccount(email: string, password: string): Promise<AuthResponse> {
  const matches = email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
  if (!matches) {
    throw new AuthError("Invalid email or password.");
  }

  const user = await UserModel.findOne({ email: DEMO_ACCOUNT.email });
  if (!user) {
    throw new AppError({ code: "demo_not_seeded", message: "Demo account is not available.", statusCode: 503 });
  }

  return {
    user: serializeUser(user),
    token: issueSessionJwt(user._id.toString()),
  };
}

function buildAppleDisplayName(fullName: AppleSignInRequest["fullName"]): string | undefined {
  if (!fullName) {
    return undefined;
  }

  const parts = [fullName.givenName, fullName.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" ") : undefined;
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const identity = await verifyGoogleIdToken(idToken);
  const user = await upsertUserFromIdentity(identity);
  const userId = user._id.toString();

  return {
    user: serializeUser(user),
    token: issueSessionJwt(userId),
  };
}

export async function signInWithApple(request: AppleSignInRequest): Promise<AuthResponse> {
  const identity = await verifyAppleIdentityToken(request.identityToken);
  const user = await upsertUserFromIdentity({
    ...identity,
    name: buildAppleDisplayName(request.fullName),
  });
  const userId = user._id.toString();

  return {
    user: serializeUser(user),
    token: issueSessionJwt(userId),
  };
}

export async function linkAppleProvider(userId: string, request: AppleSignInRequest): Promise<User> {
  const identity = await verifyAppleIdentityToken(request.identityToken);
  const user = await linkProviderIdentityToUser(userId, {
    ...identity,
    name: buildAppleDisplayName(request.fullName),
  });

  return serializeUser(user);
}
