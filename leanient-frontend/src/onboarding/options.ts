import type {
  JourneyStage,
  LeanientFocusArea,
  GoalPace,
  TrainingStatus,
  MedicationCatalogItem,
} from "@leanient/shared";

/**
 * Onboarding option lists. Each option pairs the display copy the user sees with
 * the EXACT shared enum value it maps to. Because `value` is typed against the
 * shared union, a change to any enum in `@leanient/shared` breaks compilation
 * here — that is the alignment guarantee.
 */
export interface Option<T> {
  label: string;
  value: T;
  /** Optional second line shown under the label (e.g. training-status cards). */
  sub?: string;
}

// Journey: the UI keeps 6 duration buckets; the contract only stores 3 stages,
// so several labels intentionally collapse onto the same `journeyStage`.
// (Finer granularity is a logged backend TODO.)
export const JOURNEY_OPTIONS: Option<JourneyStage>[] = [
  { label: "Just starting / about to start", value: "pre_start" },
  { label: "1–3 months in", value: "active_loss" },
  { label: "3–6 months in", value: "active_loss" },
  { label: "6–12 months in", value: "active_loss" },
  { label: "Over a year in", value: "maintenance" },
  { label: "I'm tapering off / planning to stop", value: "maintenance" },
];

// Fear: maps to `LeanientFocusArea`. Two labels have no exact enum value yet and
// fold onto the closest one (`confidence`) — logged as a backend TODO to add
// `weight_regain` / `guidance`.
export const FEAR_OPTIONS: Option<LeanientFocusArea>[] = [
  { label: "Losing muscle along with the fat", value: "losing_muscle" },
  { label: "“Ozempic face” / looking older or hollow", value: "ozempic_face" },
  { label: "Gaining it all back when I stop", value: "confidence" }, // orphan → closest
  { label: "Side effects making it hard to live normally", value: "side_effects" },
  { label: "Not knowing if I'm doing this right", value: "confidence" }, // orphan → closest
];

// Training status: the 4 options map exactly onto the `TrainingStatus` enum.
// This feeds the backend Mifflin-St Jeor calorie model (activity factor) plus the
// inferred weekly workout target and equipment access.
export const TRAINING_STATUS_OPTIONS: Option<TrainingStatus>[] = [
  { label: "Not training", value: "not_training", sub: "I'm not lifting or working out regularly." },
  { label: "Beginner", value: "beginner", sub: "I've started in the last few weeks." },
  { label: "Consistent", value: "consistent", sub: "I train multiple times per week." },
  { label: "Returning", value: "returning", sub: "I trained before, getting back into it." },
];

// Pace personas. Display labels are the prototype's (Steady/Balanced/Fast); they
// map by increasing speed onto the 3 `goalPace` enum values. `chevrons` drives the
// icon count and `coach` is the pill copy shown when that pace is active.
export interface PaceOption {
  label: string;
  value: GoalPace;
  chevrons: number;
  coach: string;
}

export const PACE_OPTIONS: PaceOption[] = [
  {
    label: "Steady",
    value: "gentle",
    chevrons: 1,
    coach: "Best for muscle retention. Slower, but it holds up.",
  },
  {
    label: "Balanced",
    value: "steady",
    chevrons: 2,
    coach: "A solid middle ground — steady loss while protecting muscle.",
  },
  {
    label: "Fast",
    value: "aggressive",
    chevrons: 3,
    coach: "Quickest results, but muscle is harder to keep. Push protein and lifting.",
  },
];

export const TRAINING_OPTIONS: Option<TrainingStatus>[] = [
  { label: "Not training right now", value: "not_training" },
  { label: "Just getting started", value: "beginner" },
  { label: "Training consistently", value: "consistent" },
  { label: "Getting back into it", value: "returning" },
];

/**
 * Energy reality (multi-select). There is no dedicated "energy" field in the
 * contract; selections map to `profile.sideEffectBaseline` — a free `string[]`
 * the backend only stores/serializes (no logic matches specific values), so
 * stable snake_case `key`s are safe. "Honestly, I feel fine" is an EXCLUSIVE
 * sentinel meaning no baseline concerns: it contributes no key (→ empty array).
 * See ONBOARDING_CONTRACT_TODOS.md item 6.
 */
export interface EnergyOption {
  label: string;
  key: string | null; // null = sentinel, stores nothing
  exclusive?: boolean;
}

export const ENERGY_OPTIONS: EnergyOption[] = [
  { label: "Pretty rough on shot days", key: "rough_shot_days" },
  { label: "Constant low energy", key: "low_energy" },
  { label: "Food sounds gross most of the time", key: "food_aversion" },
  { label: "I can barely hit protein", key: "low_protein_intake" },
  { label: "Honestly, I feel fine", key: null, exclusive: true },
  { label: "I'm worried about side effects but don't have many yet", key: "side_effect_worry" },
];

/**
 * GLP screen selection. A real medication carries its catalog id + name (the
 * shape `medicationProtocol` needs); the two non-medication answers are sentinels
 * the flow branches on (skip the protocol step, mark `notOnGlp`).
 */
export type GlpSelection =
  | { kind: "medication"; medicationCatalogId: string; medicationName: string }
  | { kind: "considering" }
  | { kind: "none" };

// Display copy keyed by catalog slug — keeps the exact labels from the design
// while sourcing ids/names from the (shared-typed) catalog.
const GLP_LABEL_BY_SLUG: Record<string, string> = {
  ozempic: "Ozempic / semaglutide",
  wegovy: "Wegovy",
  mounjaro: "Mounjaro / tirzepatide",
  zepbound: "Zepbound",
  compounded: "Compounded semaglutide or tirzepatide",
};

/** Build the GLP option list from the medication catalog + the two sentinels. */
export function buildGlpOptions(catalog: MedicationCatalogItem[]): Option<GlpSelection>[] {
  const meds: Option<GlpSelection>[] = catalog.map((item) => ({
    label: GLP_LABEL_BY_SLUG[item.slug] ?? item.brandNames[0] ?? item.genericName,
    value: {
      kind: "medication",
      medicationCatalogId: item.id,
      medicationName: item.brandNames[0] ?? item.genericName,
    },
  }));
  return [
    ...meds,
    { label: "Not yet, but I'm considering it", value: { kind: "considering" } },
    { label: "I'm not on a GLP-1", value: { kind: "none" } },
  ];
}
