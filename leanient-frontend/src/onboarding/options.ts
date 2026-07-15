import type {
  EquipmentAccess,
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

// Journey: the v2 conversation's 5 stages (onboarding-v2 frame 02); the
// contract only stores 3 stages, so labels collapse onto the same
// `journeyStage`. (Finer granularity is a logged backend TODO.)
export const JOURNEY_OPTIONS: Option<JourneyStage>[] = [
  { label: "Still considering", value: "pre_start" },
  { label: "Starting this month", value: "pre_start" },
  { label: "My first weeks", value: "active_loss" },
  { label: "Months in", value: "active_loss" },
  { label: "A year or more", value: "maintenance" },
];

// Fear: the v2 worry list (onboarding-v2 frame 08), mapped to
// `LeanientFocusArea`. Three labels have no exact enum value yet and fold onto
// the closest one — logged as a backend TODO to add
// `weight_regain` / `cost` / `needles`.
export const FEAR_OPTIONS: Option<LeanientFocusArea>[] = [
  { label: "Losing muscle with the fat", value: "losing_muscle" },
  { label: "Loose skin", value: "ozempic_face" }, // closest: appearance change
  { label: "Gaining it back", value: "confidence" }, // orphan → closest
  { label: "Side effects", value: "side_effects" },
  { label: "What it costs", value: "confidence" }, // orphan → closest
  { label: "Needles", value: "side_effects" }, // orphan → closest
];

// Training status: the v2 conversation's 3 cards (onboarding-v2 frame 13).
// "Not at all yet" is framed as the perfect starting point. The `returning`
// enum value keeps existing but has no card; the backend still accepts it.
// This feeds the backend Mifflin-St Jeor calorie model (activity factor) plus
// the inferred weekly workout target.
export const TRAINING_STATUS_OPTIONS: Option<TrainingStatus>[] = [
  { label: "Not at all yet", value: "not_training", sub: "Perfect starting point. We begin at 15 minutes." },
  { label: "Here and there", value: "beginner", sub: "We make it stick." },
  { label: "Regularly", value: "consistent", sub: "We make it count." },
];

// Equipment at home (onboarding-v2 frame 13's second chip group) → the shared
// `EquipmentAccess` enum. "Bands" folds onto bodyweight_only (closest tier:
// minimal-equipment programming) — a `bands` enum value is a backend TODO.
export const EQUIPMENT_OPTIONS: Option<EquipmentAccess>[] = [
  { label: "Nothing yet", value: "none" },
  { label: "Bands", value: "bodyweight_only" }, // orphan → closest
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Full gym", value: "full_gym" },
];

// Pace cards (onboarding-v2 frame 12), in increasing speed so the array index
// doubles as the pace bucket (see pace.ts / planPreview.ts findIndex math).
// Steady is the pre-selected muscle-safe sweet spot; its sub gains the user's
// computed landing date on the Pace screen. Ambitious warns gently instead of
// forbidding.
export interface PaceOption {
  label: string;
  value: GoalPace;
  sub: string;
}

export const PACE_OPTIONS: PaceOption[] = [
  { label: "Gentle", value: "gentle", sub: "Easiest on your muscle and your energy." },
  { label: "Steady", value: "steady", sub: "The muscle-safe sweet spot." },
  { label: "Ambitious", value: "aggressive", sub: "Faster loss asks more of your muscle. We guard it harder." },
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
  { label: "Nausea", key: "nausea" },
  { label: "Tired days", key: "tired_days" },
  { label: "Quiet appetite", key: "quiet_appetite" },
  { label: "Food noise is gone", key: "food_noise_gone" },
  { label: "Constipation", key: "constipation" },
  { label: "Honestly, great", key: null, exclusive: true },
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
