# AppsFlyer Attribution Design

## Context

Leanient uses Expo SDK 54 with committed native iOS sources and RevenueCat for subscriptions. The attribution integration must run in native builds, keep AppsFlyer credentials out of committed source, and preserve RevenueCat as the source of subscription, trial, renewal, and purchase forwarding.

## Approach

Use `react-native-appsflyer` for install/session attribution and non-revenue in-app events. Add `expo-tracking-transparency` for the iOS ATT permission path. Convert `leanient-frontend/app.json` to `app.config.js` so AppsFlyer values can be read from environment variables and exposed through Expo config `extra` without committing the actual dev key.

AppsFlyer initializes once at app startup. It requests ATT on iOS when available, configures debug logging only in development, sets the Leanient user id as the AppsFlyer customer user id when known, and starts the SDK independently from auth. If the app launches signed out, the SDK still starts for install tracking; after auth, the service updates the customer user id.

RevenueCat remains the purchase pipeline. After RevenueCat is configured, Leanient collects RevenueCat device identifiers and passes the AppsFlyer ID to RevenueCat so RevenueCat can forward trial, purchase, renewal, and subscription lifecycle events through its AppsFlyer dashboard integration. Leanient does not manually log purchase or revenue events to AppsFlyer.

## Registration Event

`af_complete_registration` is gated by the backend auth response. The backend will add `isNewUser` to `POST /auth/google`, `POST /auth/apple`, and `POST /auth/demo` responses. Google and Apple will return `true` only when `upsertUserFromIdentity` creates a new user document. Returning users and email/provider-linked existing users return `false`. Demo login always returns `false`.

The frontend distinguishes three cases:

- `isNewUser === true`: log `af_complete_registration`.
- `isNewUser === false`: do not log.
- `isNewUser` missing: do not log and warn in development.

This fails closed so an older backend deploy can temporarily miss registration events without corrupting ad optimization by firing on every sign-in.

## Native Configuration

The Expo config will include the AppsFlyer config plugin with current option names from the SDK docs. Purchase Connector is left disabled because RevenueCat forwards subscription revenue server-side and direct client purchase logging can double count revenue.

The ATT plugin will add a positive `NSUserTrackingUsageDescription`. AppsFlyer dev key and Apple App ID come from `EXPO_PUBLIC_APPSFLYER_DEV_KEY` and `EXPO_PUBLIC_APPSFLYER_APP_ID`. `.env.example` documents the names only.

SKAdNetwork support is handled by the AppsFlyer SDK/config plugin where generated native config supports it. Verification will inspect generated iOS config after prebuild or native dependency installation.

## Testing

Add backend tests proving new auth responses include `isNewUser` for first-time Google/Apple users, existing users, and demo login. Add user-service tests proving the upsert helper exposes whether it created a new document.

Add frontend tests for the auth registration gate: true fires once, false does not fire, and missing does not fire while warning in development. Add service tests for RevenueCat AppsFlyer attribution handoff and AppsFlyer SDK initialization behavior where the native modules can be mocked.

## Deployment Behavior

If backend and frontend ship together, registration events start after the updated backend is deployed. If the frontend ships before the backend, install tracking, ATT, SKAN, and RevenueCat forwarding still work; only `af_complete_registration` remains suppressed with a dev warning until auth responses include `isNewUser`.
