import type { AuthResponse } from "@leanient/shared";
import type { AppleSignInRequest } from "@leanient/shared";
import { verifyAppleIdentityToken } from "../auth/apple";
import { verifyGoogleIdToken } from "../auth/google";
import { issueSessionJwt } from "../auth/jwt";
import { serializeUser, upsertUserFromIdentity } from "./user.service";

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
