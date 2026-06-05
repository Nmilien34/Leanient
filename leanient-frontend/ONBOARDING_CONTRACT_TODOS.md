# Onboarding — Backend Contract Gaps (TODO)

Surfaced during the frontend onboarding alignment pass (per Frontend Contract
Discipline, Rules 2 & 4). These are **backend / `@leanient/shared` changes** to be
specced as separate, focused prompts. The frontend does **not** patch around them;
it collects what the UI needs into clearly-marked frontend-only state and maps to
the existing contract everywhere a field already exists.

Source of truth: `shared/src/schemas/index.ts` (`onboardingCompleteRequestSchema`),
`shared/src/types/index.ts`, `shared/src/constants/index.ts`.

> Note on shared edits: the frontend resolves `@leanient/shared` from `shared/src`,
> but the backend resolves from `shared/dist`. After any shared change, run
> `npm run build -w @leanient/shared` before backend typechecks.

---

## 1. Sex, age, height have no contract field at all  ·  HIGH

The Basics screen collects **sex assigned at birth** + **age**, and the planned
Height & Weight screen collects **height**. None of these exist in `UserProfile`,
the onboarding request, or anywhere in the backend — confirmed by repo-wide search.
The Basics subtext ("we use this to set protein targets and metabolic baselines")
is currently unbacked: the verdict/protein logic does not consume sex/age/height.

- **Frontend today:** stored in `OnboardingDraft.basics` (`src/onboarding/draft.ts`),
  typed `FrontendOnlyBasics`, **dropped at submit** (`src/onboarding/submit.ts`).
- **Decision (user):** keep collecting in UI now; add to backend later.
- **Backend work to spec:** add `sexAssignedAtBirth`, `age` (or `dateOfBirth`),
  `heightValue` + `heightUnit` (reuse `MEASUREMENT_UNITS` = `in|cm`) to
  `userProfileCoreSchema` / `UserProfile`; have the verdict/protein service actually
  use them for protein targets + metabolic baselines. Then remove the frontend-only
  slice and route these through `profile`.

## 2. Journey stage loses granularity  ·  MEDIUM

UI has 6 duration buckets; `JOURNEY_STAGES` has only 3 (`pre_start|active_loss|maintenance`).
Several UI options collapse onto the same value (see `JOURNEY_OPTIONS` in
`src/onboarding/options.ts`), so "1–3 / 3–6 / 6–12 months" are indistinguishable in
stored data.

- **Decision (user):** keep the richer copy, map to the 3 enums now.
- **Backend work to spec (optional):** add a finer-grained field (e.g.
  `monthsOnGlp` or a `journeyDurationBucket` enum) if product wants the nuance back.

## 3. Two "biggest fear" options map to nothing  ·  MEDIUM

`LeanientFocusArea` = `losing_muscle|ozempic_face|strength|energy|side_effects|confidence`.
The UI's "Gaining it all back when I stop" and "Not knowing if I'm doing this right"
have no matching value and currently both fold onto `confidence` (see `FEAR_OPTIONS`
in `src/onboarding/options.ts`).

- **Decision (user):** map orphans to closest (`confidence`) now.
- **Backend work to spec:** add `weight_regain` and `guidance` to
  `LEANIENT_FOCUS_AREAS`, then update the mapping to 1:1.

## 4. `medicationProtocol` is required but under-collected  ·  HIGH

`onboardingCompleteRequestSchema.medicationProtocol` requires `medicationName`,
`doseUnit`, `shotDay`, `startDate`. The current 11-screen flow collects none of the
protocol details, and two GLP answers ("Not yet…", "I'm not on a GLP-1") produce no
`medicationName` at all.

- **Decision (user):** add a short "your protocol" step (shot day + dose + start
  date) after the GLP screen; non-GLP users skip it.
- **Frontend today:** GLP screen writes `medicationName` + `medicationCatalogId` for
  real meds, or sets `OnboardingDraft.notOnGlp = true` for the sentinels.
- **Backend question to confirm:** the non-GLP path — should onboarding accept a
  missing/optional `medicationProtocol` (backend change), or do we force
  `journeyStage: "pre_start"` + a minimal placeholder protocol? Decide before the
  Crafting screen calls `submit()`.

## 5. Medication catalog source  ·  LOW (integration)

GLP options are currently built from `src/mocks/medications.ts`
(`mockMedicationCatalog: MedicationCatalogItem[]`). At integration, swap for
`LeanientDataContext.getMedicationCatalog()` (`GET /medications`). No contract change
— just remove the mock import in `GlpScreen.tsx`.

## 0b. BLOCKING — `equipmentAccess` / `weeklyWorkoutTarget` declared inconsistently  ·  CODEX

Codex added two profile fields: `equipmentAccess` (new `EQUIPMENT_ACCESS_OPTIONS` enum)
and `weeklyWorkoutTarget` (int). They are declared **inconsistently** across the contract:

- `userProfileCoreSchema` (→ onboarding request + `userContextSnapshotSchema`): both `.optional()`
- `UserProfile` type + `userProfileResponseSchema`: both **required**

Because `userContextSnapshotSchema` parses from the *optional* core but the
`UserContextSnapshot` TS type requires them, the existing
`leanient-frontend/src/services/api.service.ts` (`normalizeContextSnapshot`) no
longer typechecks. The frontend can't fix this without inventing default
`equipmentAccess` / `weeklyWorkoutTarget` values (forbidden by Rule 2).

**Codex to reconcile:** make the snapshot path consistent — either relax
`UserContextSnapshot.profile` to optional for these two, or make the core schema
require them. (Looks intentional that they're optional on *input* — backend
`lib/training.ts#computeWeeklyWorkoutTarget(trainingStatus)` derives the target —
so the likely fix is making the snapshot/profile *type* optional for them.)

**Onboarding impact:** both are optional on `onboardingCompleteRequestSchema.profile`,
so `submit.ts` stays valid without sending them. `weeklyWorkoutTarget` is computed
server-side from `trainingStatus`. **`equipmentAccess` is a NEW onboarding-relevant
question** with no screen yet — decide whether to add an "equipment access" step or
let the backend default it.

---

## 0. BLOCKING — daily targets need a shared `computeDailyTargets()`  ·  CODEX

Codex added two **required, client-provided** fields to `userProfileCoreSchema`
(→ `onboardingCompleteRequestSchema.profile`):
`dailyProteinTarget: z.number().positive()` and `dailyCalorieTarget: z.number().positive()`.
The onboarding service trusts the client (`$set body.profile`) — no server-side
computation — and no formula exists anywhere to reuse.

**Agreed approach (single source of truth):** Codex adds to `@leanient/shared`:

```ts
export interface DailyTargetsInput {
  goalWeight: number;
  goalWeightUnit: WeightUnit;          // "lb" | "kg"
  goalPace: GoalPace;                  // "gentle" | "steady" | "aggressive"
  currentWeight?: number;              // = initialWeight.value
  // metabolic inputs — FRONTEND-ONLY today (gap #1). Helper must degrade
  // gracefully when absent so the backend can recompute from contract fields.
  sexAssignedAtBirth?: "female" | "male" | "prefer_not_to_say";
  age?: number;
  heightValue?: number;
  heightUnit?: "in" | "cm";
}
export function computeDailyTargets(input: DailyTargetsInput): {
  dailyProteinTarget: number;          // grams/day, > 0
  dailyCalorieTarget: number;          // kcal/day, > 0
};
```

**Frontend is wired and waiting:** `src/onboarding/submit.ts` already imports and
calls `computeDailyTargets(...)`. The frontend typecheck is intentionally red on
exactly that one import until Codex ships the export; then it goes green with no
further frontend change.

**Coupling to gap #1:** for the helper to use sex/age/height (and for the backend
to recompute identically), those fields should also be added to the contract.
Otherwise the helper must compute from `goalWeight`/`goalPace`/`currentWeight` only.

---

## 6. Energy screen mapping (upcoming)  ·  TBD

The planned Energy multi-select has no obvious 1:1 home: `WORKOUT_ENERGY_PHASES`
is workout-linked, not profile-linked; `profile.sideEffectBaseline: string[]` is the
closest profile field. Confirm the intended mapping when that screen is built before
inventing anything.

---

## Frontend rule readiness (R5/R6/R7) — for screens not yet built

These are NOT backend gaps; they are reminders so the next screens stay aligned.

- **R5 (typed calls):** all network goes through `apiService` (`src/services/api.service.ts`),
  which validates responses with shared Zod schemas. Never call `fetch`/`axios` from a
  screen. List endpoints with query params (e.g. `/meal-logs?from&to&limit`) must build
  the params from the shared request schema/type, not a local `{ from?: string }` shape.
- **R6 (typed errors):** the client rethrows the raw `AxiosError`. Screens/contexts must
  run it through `extractApiError()` (`src/services/apiError.ts`) and branch on
  `error.code` (an `ApiError` from shared), never on `error.message`.
- **R7 (3 states):** no data-fetching screen exists yet. The FIRST fetch will be the GLP
  medication catalog (today a typed mock, `src/mocks/medications.ts`). When the main
  screens (Home/Verdict/Workouts/Progress) and the live catalog fetch land, each MUST
  implement loading + empty + error states, with named typed mocks per state
  (e.g. `mockVerdictOnTrack`, `mockVerdictNoData`) in `src/mocks/`.
