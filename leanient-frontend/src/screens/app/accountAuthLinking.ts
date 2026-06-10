import type { AuthProvider } from "@leanient/shared";

export function providerCanBeLinkedFromSettings({
  provider,
  linked,
  platform,
}: {
  provider: AuthProvider;
  linked: boolean;
  platform: string;
}): boolean {
  return provider === "apple" && !linked && platform === "ios";
}
