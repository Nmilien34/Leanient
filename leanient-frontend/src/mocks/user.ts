import type { User } from "@leanient/shared";

/**
 * Typed mock User for the Profile screen in dev. Swap for `AuthContext.user`
 * (set on sign-in) at integration. Typed against shared `User`.
 */
const STAMP = "2026-04-20T12:00:00.000Z";

export const mockUser: User = {
  id: "user_demo",
  email: "nickson@lawnstack.com",
  emailVerified: true,
  onboardingComplete: true,
  authProviders: [{ provider: "apple", providerUserId: "apple_demo", linkedAt: STAMP }],
  displayName: "Nickson",
  hasAvatar: false,
  subscriptionStatus: "active",
  entitlementExpiresAt: "2027-03-03T12:00:00.000Z",
  subscriptionWillRenew: true,
  createdAt: STAMP,
  updatedAt: STAMP,
};
