/**
 * The demo account used only for App Store review (guideline 2.1a). A reviewer
 * signs in with these credentials and lands on a pre-seeded account with weeks of
 * realistic data. Seed it with `npm run seed:demo`; the login is handled by
 * `signInWithReviewAccount`. The password can be overridden via env; the default
 * lets review work out of the box. This is a read-only demo, not a real user.
 */
export const DEMO_ACCOUNT = {
  email: "review@leanient.app",
  password: process.env.REVIEW_DEMO_PASSWORD ?? "LeanientReview2026!",
  displayName: "App Reviewer",
};
