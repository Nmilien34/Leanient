# Leanient

Leanient is the GLP-1 companion built for one promise: lose the fat, keep yourself intact.

This scaffold sets up the foundation only: workspace structure, shared types and schemas, backend auth infrastructure, user persistence, health checks, product foundation models, and deployment config. It includes the data surfaces needed for Leanient's weekly verdict, while leaving full UI flows, paywalls, push notifications, and AI coach chat for later passes.

## Structure

| Folder               | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `shared/`            | Shared TypeScript types, Zod schemas, constants, and pure utilities |
| `leanient-backend/`  | Express 5 + TypeScript API for Render                               |
| `leanient-frontend/` | Minimal Expo React Native shell for Vercel web export               |

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas cluster or local MongoDB
- Google Cloud OAuth client for Google Sign-In
- Apple Developer Sign in with Apple key and identifiers
- AWS S3 bucket for progress photos
- RevenueCat project for subscriptions

## Install

```bash
npm install
```

## Environment

Copy the backend template and fill values:

```bash
cp leanient-backend/.env.example leanient-backend/.env
```

Required backend variables:

- `NODE_ENV`: `development`, `production`, or `test`
- `PORT`: API port, defaults to `8080`
- `MONGODB_URI`: MongoDB Atlas or local Mongo connection string
- `JWT_SECRET`: random session secret with at least 32 characters
- `JWT_EXPIRES_IN`: session lifetime, defaults to `30d`
- `GOOGLE_CLIENT_ID`: Google Cloud Console OAuth 2.0 web client ID
- `APPLE_CLIENT_ID`: Apple Service ID or bundle ID used as the token audience
- `APPLE_TEAM_ID`: Apple Developer team ID
- `APPLE_KEY_ID`: Sign in with Apple key ID
- `APPLE_PRIVATE_KEY`: PEM private key with escaped `\n` line breaks
- `APPLE_PRIVATE_KEY_BASE64`: optional base64 PEM alternative for Render
- `FRONTEND_ORIGIN`: deployed or local frontend origin allowed by CORS
- `AWS_REGION`: AWS region for progress photo S3 storage
- `AWS_S3_BUCKET_NAME`: private S3 bucket for progress photos
- `AWS_ACCESS_KEY_ID`: IAM key for signed progress photo uploads/downloads
- `AWS_SECRET_ACCESS_KEY`: matching IAM secret
- `REVENUECAT_WEBHOOK_SECRET`: bearer token RevenueCat sends to `/webhooks/revenuecat`
- `SCHEDULER_TIMEZONE`: timezone for weekly missed-check-in verdict maintenance
- `WEEKLY_VERDICT_CRON`: cron expression, defaults to Monday morning

Frontend variables live in `leanient-frontend/.env.example`:

- `EXPO_PUBLIC_API_BASE_URL`: API base URL for Expo
- `NEXT_PUBLIC_API_BASE_URL`: Vercel-friendly alias for the same API base URL

## Development

```bash
npm run dev
```

The root dev script builds `shared/`, then runs:

- `shared`: TypeScript watch build
- `leanient-backend`: `tsx watch src/server.ts`
- `leanient-frontend`: Expo dev server

Backend routes:

- `GET /healthz`
- `POST /auth/google`
- `POST /auth/apple`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `POST /onboarding/complete`
- `GET /me/profile`
- `PATCH /me/profile`
- `GET /me/medication`
- `PATCH /me/medication`
- `POST /weight-logs`
- `GET /weight-logs`
- `POST /weekly-checkins`
- `GET /weekly-verdicts/latest`
- `GET /workouts`
- `GET /workouts/recommended`
- `GET /medications`
- `POST /progress-photos/upload-intent`
- `POST /progress-photos/confirm`
- `GET /progress-photos`
- `GET /progress-photos/:id/view-url`
- `DELETE /progress-photos/:id`
- `POST /webhooks/revenuecat`

All success responses use `{ "data": ... }`. All errors use `{ "error": { "code", "message", "details" } }`.

## Product Foundations

- `WeeklyCheckin` stores raw weekly inputs plus `userContextSnapshot`, so a verdict can be replayed later without reading today's changed profile.
- `WeeklyVerdict` stores computed verdict snapshots. Home reads the latest stored verdict.
- The weekly scheduler runs Monday morning. It backfills missing verdicts from submitted check-ins and creates `no_data` verdicts when a week closed without a check-in.
- Workouts and medication catalog entries live in MongoDB from day one and are seeded idempotently at startup.
- Progress photo routes issue S3 signed URLs and store only metadata in MongoDB.
- RevenueCat webhook history is stored in `SubscriptionEvent`, while current entitlement state lives on `User`.
- Verdict copy is deterministic through `coachContent.service.ts`; OpenAI can plug in later without changing route shapes.

## API Keys

See `docs/API_KEYS.md` for the exact checklist before production setup.

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deploy

Render backend:

```bash
npm run build -w @leanient/shared
npm run build -w @leanient/backend
npm run start -w @leanient/backend
```

Render can also use `render.yaml` from the repo root. Set the synced env vars in the Render dashboard.

Vercel frontend:

```bash
cd leanient-frontend
vercel
```

Set the Vercel project root to `leanient-frontend/`. The included `leanient-frontend/vercel.json` installs from the workspace root, builds `shared/`, then exports Expo web output to `leanient-frontend/dist`.
