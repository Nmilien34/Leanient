# Leanient Backend — Audit Report

_Verification pass. Date: 2026-05-31. Auditor: Claude._
_Scope: read-only audit + a narrow set of critical fixes. No features added, no refactors._

---

## 1. Summary

The Leanient backend is a **genuinely solid, well-structured scaffold** that is *more rigorous than the Carbon-Foster reference repo* in almost every dimension (Zod-validated fail-fast env, an `AppError` hierarchy, a centralized error handler, a real logger with request IDs, helmet + CORS allow-list + rate limiting, a DB health ping, graceful shutdown, and a test suite). `typecheck`, `lint`, and `test` all pass cleanly across all three workspaces. The server composes correctly and boots.

The biggest *risks* are not code-quality issues — they are **configuration/naming reconciliation** items that will bite during the integration pass:
1. A live `.env` containing **real secrets** sits in the repo root (gitignored and untracked, so not leaked to git — but the keys should be rotated and treated as exposed).
2. The implemented env-var **names differ from the canonical list** in the audit brief (`GOOGLE_CLIENT_ID` vs `GOOGLE_CLIENT_ID_IOS`, `AWS_S3_BUCKET_NAME` vs `AWS_S3_BUCKET`, `REVENUECAT_WEBHOOK_SECRET` vs `REVENUECAT_WEBHOOK_AUTH_HEADER`). The code, `.env.example`, `render.yaml`, and tests are **internally consistent**, but your *live* `.env` already uses two names the code does **not** read (`AWS_S3_BUCKET`, `RevenueCat_Webhook_Secret_test`).

**Recommendation: the scaffold is READY for the integration pass.** Resolve the env-naming convention and rotate the on-disk secrets before wiring Google/S3/RevenueCat, but nothing blocks starting.

> Tooling note: the project uses **npm workspaces**, not pnpm. All `pnpm` commands in the brief map to `npm run … -ws`. `node_modules` was already installed; I did not re-run a clean install, but every script below ran successfully against the installed tree.

| Check | Result |
|---|---|
| `npm run typecheck` (shared, backend, frontend) | ✅ Pass, no errors |
| `npm run lint` (eslint .) | ✅ Pass, exit 0, no warnings |
| `npm run test` | ✅ Pass — backend 17 tests / 6 files, frontend 11 tests / 7 files, shared green |
| Server composition / boot path | ✅ Composes; `/healthz` pings DB |

---

## 2. What works (confirmed, with citations)

- **Env loading** — `leanient-backend/src/config/env.ts`: Zod schema, `safeParse(process.env)`, throws `"Invalid environment configuration"` on failure (fail-fast, lines 58–64). `JWT_SECRET` enforced `min(32)`. Production-only required keys enforced via `superRefine` (lines 37–55). Apple key accepts PEM or base64 with a normalize helper (66–75). Clean typed `env` export object (79–113).
- **`process.env` is NOT accessed outside config** in production code. The only other hits are `src/tests/setup.ts` (lines 1–22), which is legitimate test bootstrapping.
- **AppError hierarchy** — `src/lib/errors.ts`: `AppError` base + `ValidationError` (400), `AuthError` (401), `NotFoundError` (**404, correct**), `InternalError` (500, `expose:false`). Matches the brief exactly.
- **Centralized error handler** — `src/middleware/error.middleware.ts`: converts any thrown error to `{ error: { code, message, details? } }` (lines 40–46), hides internal messages when `expose:false`, logs 5xx at error / 4xx at warn with `requestId`. `notFoundHandler` returns a 404 `NotFoundError`.
- **Response shape** — `src/lib/responses.ts`: `sendData()` → `{ data: T }`; `sendNoContent()` → 204. Types come from `@leanient/shared` (`ApiResponse<T>`, `ApiError`).
- **`/healthz` genuinely pings the DB** — `src/routes/health.routes.ts` + `src/db/mongo.ts:isDatabaseReachable()` (checks `readyState === 1` and runs `db.admin().ping()` with a 3s timeout; returns 503 if unreachable, 200 `{data:{status,db,service}}` when healthy).
- **DB lifecycle** — `src/db/mongo.ts`: `connect()` with `maxPoolSize:10`, `serverSelectionTimeoutMS:5000`, `socketTimeoutMS:45000`, `connectTimeoutMS:10000`; ensures indexes via `createIndexes()` on all 10 models; idempotent catalog seeds; `disconnect()`; connection event listeners.
- **Server composition** — `src/server.ts`: order is `x-powered-by off → helmet → cors(allowlist) → json(1mb) → requestLogger → /healthz → rate-limit(/auth) → routes → notFound → errorHandler`. CORS allows `FRONTEND_ORIGIN` + `localhost/127.0.0.1:*` in dev only (lines 29–57). Rate limiter on `/auth` (30 req / 15 min). Graceful SIGINT/SIGTERM shutdown that stops the scheduler and disconnects (101–116).
- **Auth verification** — Google via `google-auth-library` (`src/auth/google.ts`), Apple via `jose` `createRemoteJWKSet` + `jwtVerify` validating `iss`/`aud`/`sub` (and `exp` by default) (`src/auth/apple.ts`). Both wrapped in a 5s `withTimeout`. Session JWT issue/verify in `src/auth/jwt.ts`.
- **Auth middleware** — `src/auth/middleware.ts`: reads `Authorization: Bearer`, verifies, sets `req.user = { id: payload.sub }`; 401 `AppError` when missing.
- **User upsert** — `src/services/auth.service.ts` → `upsertUserFromIdentity`: verify → upsert by identity → issue JWT → return `{ user, token }`; Apple `fullName` handled on first sign-in (lines 31–43).
- **User model** — `src/models/user.model.ts`: matches the brief (`email` sparse+unique+lowercase, `emailVerified`, `authProviders[]` with `provider`/`providerUserId`/`linkedAt` and `_id:false`, `displayName`, `avatarUrl`, `timestamps`). Compound **unique partial index** on `(authProviders.provider, authProviders.providerUserId)` (103–115).
- **shared/** — browser-safe (only dep is `zod`), barrel `src/index.ts`, defines the canonical `ApiResponse<T>` / `ApiError` / `ApiErrorResponse` shapes, builds to `dist/` consumed by backend. tsconfig extends base.
- **Root configs** — `tsconfig.base.json` with `@leanient/shared` path alias; each package `extends` it; npm workspaces; `predev`/`prelint`/`pretypecheck` build shared first; `render.yaml` (`/healthz`, build pre-builds shared, secrets `sync:false`); `leanient-frontend/vercel.json` (monorepo build + SPA rewrite).
- **Tests** — vitest per package; backend has a server smoke test + service tests (verdict, coachContent, revenueCat, scheduler, progressPhoto); frontend tests for auth/data contexts and services.

---

## 3. Critical fixes applied

**1 fix applied.**

1. **`leanient-backend/src/auth/google.ts` (line ~14)** — Google `verifyIdToken` `audience` changed from a single string (`env.google.clientId`) to an array (`[env.google.clientId]`). _Rationale: explicitly authorized in the brief's narrow fix list; future-proofs adding web/Android client IDs without a code change. Verified backend `tsc --noEmit` still passes._

_Transparency note:_ I initially renamed three vars in `.env.example` (root + backend) believing the templates mismatched the code. After reading `config/env.ts` cleanly, I confirmed the templates **already matched** the code (`GOOGLE_CLIENT_ID`, `AWS_S3_BUCKET_NAME`, `REVENUECAT_WEBHOOK_SECRET`) — there was no mismatch — and **reverted** that edit. Net change to `.env.example`: none. No other fixes were applied.

No TS errors, failing tests, missing `.gitignore` entries, `process.env` leaks, or broken `/healthz` were found, so none were fixed.

---

## 4. Pattern deviations from Carbon-Foster

Important framing: **Carbon-Foster is the *looser* codebase.** It has no Zod env (scattered `process.env`), no `AppError` classes (per-controller `try/catch`), `console.log` logging, no tests, no deploy config, and a `{ success, data }` response shape. Most "deviations" below are Leanient being **more rigorous**, which I read as intentional and correct. I changed none of them.

| # | Area | Codex (Leanient) | Carbon-Foster | Severity | Recommendation |
|---|---|---|---|---|---|
| 1 | **Response shape** | `{ data: T }` / `{ error: { code, message, details? } }` (no `success` bool) | `{ success: true, data }` / `{ success: false, message }` | Meaningful | **Decide.** Leanient is internally consistent (shared types + frontend both use `{data}`). Only flag if any existing client expects `success`. Likely leave as-is. |
| 2 | **Env config** | Zod fail-fast, centralized `env` object | `dotenv.config()` + raw `process.env` everywhere | Structural (improvement) | Leave alone — better. |
| 3 | **Error handling** | `AppError` hierarchy + central handler | inline `try/catch`, plain `Error` | Structural (improvement) | Leave alone — better. |
| 4 | **Logging** | structured logger + request IDs | `console.log` w/ `[FOSTER-*]` prefixes | Meaningful (improvement) | Leave alone — better. |
| 5 | **Middleware** | helmet + CORS allow-list + rate limit + requestLogger + error handler | cors + json + logger only | Structural (improvement) | Leave alone — better. |
| 6 | **Controllers** | route files call services directly (no `controllers/` dir) | `controllers/` + `routes/` split | Cosmetic | Leave alone. Reasonable for the size. |
| 7 | **Apple auth** | `jose` remote JWKS | `jsonwebtoken` + manual key fetch/cache | Cosmetic (improvement) | Leave alone — better. |
| 8 | **Tests** | vitest suite per package | none | Structural (improvement) | Leave alone — better. |
| 9 | **Workspace** | npm **workspaces** monorepo + `@leanient/shared` | standalone npm package | Structural | Leave alone — intended. |

---

## 5. Open questions for you (product / convention decisions)

1. **Env var naming vs your canonical list.** The code uses `GOOGLE_CLIENT_ID` (single), `AWS_S3_BUCKET_NAME`, `REVENUECAT_WEBHOOK_SECRET`. Your brief's canonical list used `GOOGLE_CLIENT_ID_IOS`, `AWS_S3_BUCKET`, `REVENUECAT_WEBHOOK_AUTH_HEADER`. Code/template/render/tests are mutually consistent, so it *works as-is* — but it diverges from the names you wrote. Do you want me to rename to the canonical set (touches `env.ts`, both `.env.example`, `render.yaml`, `tests/setup.ts`)? I left it untouched (rename = out of scope this pass).
2. **⚠️ Your live `.env` is already misnamed for two keys.** It uses `AWS_S3_BUCKET` and `RevenueCat_Webhook_Secret_test`, but the code reads `AWS_S3_BUCKET_NAME` and `REVENUECAT_WEBHOOK_SECRET`. As-is, S3 bucket and the RevenueCat webhook secret will load as **empty/undefined**. Rename them in your `.env` (or pick the canonical set in #1 and I'll align the code).
3. **Secrets hygiene.** `/.env` holds live Google OAuth secret, OpenAI key, Mongo Atlas URI, AWS keys, and a RevenueCat secret. It's gitignored and untracked (good), but treat all of these as **exposed and rotate them**, then keep them only in Render + your local `.env`. (Security, not a code fix — I did not touch your `.env`.)
4. **User model already carries subscription fields.** `subscriptionStatus`, `entitlementExpiresAt`, `subscriptionWillRenew`, `revenueCatCustomerId`, `revenueCatEntitlement` are present now (your brief expected a minimal auth-only User). This is reasonable pre-wiring for the RevenueCat pass. Keep, or strip until that pass? (Left untouched per scope — model changes were explicitly out of scope.)
5. **`OPENAI_API_KEY` is absent** from both `env.ts` and `.env.example`, though your canonical list expects it as a stub. Add a stub now, or introduce it during the OpenAI pass?
6. **Multi-client Google plan.** `verifyIdToken` now accepts an array, but `env.ts` still loads one `GOOGLE_CLIENT_ID`. When you add iOS/web/Android clients, do you want a comma-separated `GOOGLE_CLIENT_IDS` or discrete `_IOS/_WEB/_ANDROID` vars? (Decides the `env.ts` shape.)
7. **(Low)** `upsertUserFromIdentity`'s lookup matches `authProviders.provider` and `authProviders.providerUserId` as two separate dot-path conditions rather than `$elemMatch`. Practically safe (provider user IDs are globally unique), slightly loose for multi-provider users. Tighten with `$elemMatch` later?

---

## 6. Readiness gate

**YES — ready for the integration pass (Google, Mongo, S3, RevenueCat, OpenAI, Apple).**

`typecheck` / `lint` / `test` are green, the server composes and boots, `/healthz` does a real DB ping, env validation is fail-fast, both auth providers are scaffolded, models + indexes + seeds are in place, and deploy configs exist.

**No blocking items.** Non-blocking housekeeping to do *before/at the start of* integration:
- Reconcile the env-var naming (Open Q #1) so integration values land under the names the code reads.
- Fix the two misnamed keys in your live `.env` (Open Q #2) — otherwise S3 and the RevenueCat webhook silently get empty config.
- Rotate the secrets currently on disk (Open Q #3).
