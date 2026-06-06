import type { OnboardingCompleteRequest } from "@leanient/shared";
import type { OnboardingDraft } from "../onboarding/draft";

/**
 * A fully-filled draft representing a user who finished every onboarding screen.
 * Used to exercise `toOnboardingCompleteRequest` / the Crafting submit path in dev.
 * Typed against `OnboardingDraft`, so contract drift breaks it at compile time.
 */
export const mockCompletedDraft: OnboardingDraft = {
  profile: {
    journeyStage: "active_loss",
    goalWeight: 165,
    goalWeightUnit: "lb",
    goalPace: "steady",
    biggestFear: "losing_muscle",
    trainingStatus: "beginner",
    sideEffectBaseline: ["nausea"],
    timezone: "America/New_York",
  },
  medicationProtocol: {
    medicationCatalogId: "med_ozempic",
    medicationName: "Ozempic",
    doseAmount: 0.5,
    doseUnit: "mg",
    shotDays: ["sunday"],
    startDate: "2025-01-15",
    active: true,
  },
  initialWeight: {
    value: 198,
    unit: "lb",
    measuredAt: "2025-01-20T12:00:00.000Z",
  },
  notOnGlp: false,
  basics: {
    sexAssignedAtBirth: "female",
    age: 34,
    heightValue: 65,
    heightUnit: "in",
  },
};

/** The exact request the backend expects, for screens/tests that need it directly. */
export const mockOnboardingRequest: OnboardingCompleteRequest = {
  profile: {
    journeyStage: "active_loss",
    goalWeight: 165,
    goalWeightUnit: "lb",
    goalPace: "steady",
    biggestFear: "losing_muscle",
    trainingStatus: "beginner",
    sideEffectBaseline: ["nausea"],
    timezone: "America/New_York",
    // Raw inputs for the backend calorie model (no targets sent from the client).
    sex: "female",
    ageYears: 34,
    heightInches: 65,
  },
  medicationProtocol: {
    medicationCatalogId: "med_ozempic",
    medicationName: "Ozempic",
    doseAmount: 0.5,
    doseUnit: "mg",
    shotDays: ["sunday"],
    startDate: "2025-01-15",
    active: true,
  },
  initialWeight: {
    value: 198,
    unit: "lb",
    measuredAt: "2025-01-20T12:00:00.000Z",
  },
};
