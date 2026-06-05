import type { AuthProvider } from "@leanient/shared";

export interface ProviderIdentity {
  provider: AuthProvider;
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}
