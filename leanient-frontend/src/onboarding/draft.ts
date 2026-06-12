import type { OnboardingCompleteRequest } from "@leanient/shared";

/**
 * The onboarding accumulator. It is typed *toward* the shared
 * `OnboardingCompleteRequest` so any backend contract change breaks compilation
 * here instead of silently drifting. Each screen fills its slice; the Crafting
 * screen assembles + submits via `toOnboardingCompleteRequest` (see submit.ts).
 */

type RequestProfile = OnboardingCompleteRequest["profile"];
type RequestMedication = NonNullable<OnboardingCompleteRequest["medicationProtocol"]>;
type RequestWeight = OnboardingCompleteRequest["initialWeight"];

/**
 * Biological inputs collected across the basics + height screens. These ARE sent
 * at submit now: the backend computes calorie/protein targets (Mifflin-St Jeor)
 * from sex, age, and height. `submit.ts` converts height to inches at the boundary.
 * Sex is male/female only (a biological input, separate from gender identity).
 */
export type SexAssignedAtBirth = "female" | "male";

export interface FrontendOnlyBasics {
  sexAssignedAtBirth?: SexAssignedAtBirth;
  age?: number;
  heightValue?: number;
  heightUnit?: "in" | "cm";
}

export interface OnboardingDraft {
  profile: Partial<RequestProfile>;
  medicationProtocol: Partial<RequestMedication>;
  initialWeight?: Partial<RequestWeight>;
  /** Set when the user picks "considering" / "not on a GLP-1" on the GLP screen. */
  notOnGlp?: boolean;
  basics: FrontendOnlyBasics;
}

export const emptyDraft: OnboardingDraft = {
  profile: {},
  medicationProtocol: {},
  basics: {},
};
