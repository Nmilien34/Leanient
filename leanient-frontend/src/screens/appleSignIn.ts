import type { AppleSignInRequest } from "@leanient/shared";

type NativeAppleFullName = {
  givenName?: string | null;
  familyName?: string | null;
};
type NativeAppleCredential = {
  identityToken?: string | null;
  fullName?: NativeAppleFullName | null;
};
type AppleAuthModule<AppleScope> = {
  AppleAuthenticationScope: {
    FULL_NAME: AppleScope;
    EMAIL: AppleScope;
  };
  signInAsync(options: { requestedScopes: AppleScope[] }): Promise<NativeAppleCredential>;
};

type RunAppleSignInOptions<AppleScope> = {
  appleAuth: AppleAuthModule<AppleScope>;
  signInWithApple(identityToken: string, fullName?: AppleSignInRequest["fullName"]): Promise<unknown>;
};

export type AppleSignInResult = "signed_in" | "cancelled";

const CANCEL_CODES = new Set(["ERR_REQUEST_CANCELED", "ERR_CANCELED", "ERR_CANCELED_BY_USER"]);

export function shouldRenderAppleSignIn(platform: string): boolean {
  return platform === "ios";
}

function normalizeNamePart(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function mapAppleFullName(fullName: NativeAppleFullName | null | undefined): AppleSignInRequest["fullName"] | undefined {
  const givenName = normalizeNamePart(fullName?.givenName);
  const familyName = normalizeNamePart(fullName?.familyName);
  if (!givenName && !familyName) {
    return undefined;
  }
  return { givenName, familyName };
}

export function isAppleSignInCancelled(error: unknown): boolean {
  return CANCEL_CODES.has(String((error as { code?: unknown })?.code));
}

export async function runAppleSignIn<AppleScope>({
  appleAuth,
  signInWithApple,
}: RunAppleSignInOptions<AppleScope>): Promise<AppleSignInResult> {
  try {
    const credential = await appleAuth.signInAsync({
      requestedScopes: [appleAuth.AppleAuthenticationScope.FULL_NAME, appleAuth.AppleAuthenticationScope.EMAIL],
    });

    if (!credential.identityToken) {
      throw new Error("Apple did not return a sign-in token.");
    }

    await signInWithApple(credential.identityToken, mapAppleFullName(credential.fullName));
    return "signed_in";
  } catch (error) {
    if (isAppleSignInCancelled(error)) {
      return "cancelled";
    }
    throw error;
  }
}
