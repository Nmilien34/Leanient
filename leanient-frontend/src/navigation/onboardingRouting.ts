interface OnboardingRoutingUser {
  onboardingComplete?: boolean;
}

export function isOnboardingCompleteForRouting(input: {
  user: OnboardingRoutingUser | null | undefined;
  hasProfile: boolean;
}): boolean {
  return input.user?.onboardingComplete ?? input.hasProfile;
}
