import { AUTH_PROVIDERS, type AuthProvider, type User } from "@leanient/shared";

/**
 * FRONTEND-ONLY view aggregate for the Account screen (24). Maps the signed-in
 * `User` to what the screen shows. The sign-in section is driven by the real
 * auth model (linked providers), not the prototype's password/phone rows, which
 * don't exist in this app (auth is social sign-in + phone OTP).
 */

export interface ProviderRow {
  provider: AuthProvider;
  label: string; // "Sign in with Apple"
  linked: boolean;
  status: string; // "Linked" | "Connect"
}

export interface AccountView {
  name: string;
  email: string | null;
  emailVerified: boolean;
  providers: ProviderRow[];
}

const PROVIDER_LABEL: Record<AuthProvider, string> = {
  apple: "Apple",
  google: "Google",
};

export function deriveAccountView(user: User): AccountView {
  const linked = new Set(user.authProviders.map((p) => p.provider));
  return {
    name: user.displayName ?? "Member",
    email: user.email ?? null,
    emailVerified: user.emailVerified,
    providers: AUTH_PROVIDERS.map((provider) => ({
      provider,
      label: `Sign in with ${PROVIDER_LABEL[provider]}`,
      linked: linked.has(provider),
      status: linked.has(provider) ? "Linked" : "Connect",
    })),
  };
}
