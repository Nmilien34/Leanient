export const APP_NAME = "Leanient";

// Mirrors app.json `expo.version`. Swap for `expo-constants`
// (`Constants.expoConfig?.version`) once that package is added.
export const APP_VERSION = "0.1.0";

export const SUPPORT_EMAIL = "support@leanient.app";
export const REPORT_PROBLEM_EMAIL = "dev@boltzman.ai";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";

export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

// Google OAuth client IDs for native Google Sign-In (@react-native-google-signin).
// Set these in the environment; an empty web client ID disables the Google
// button (it surfaces a config notice rather than failing). The WEB client ID is
// required — it's the audience the backend validates the idToken against (must
// match GOOGLE_CLIENT_ID in the backend env). iOS uses its own client ID for the
// native sheet; Android resolves via google-services.json (no client ID here).
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
