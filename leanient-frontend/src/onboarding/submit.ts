import {
  computeWeeklyWorkoutTarget,
  inferEquipmentAccessFromTrainingStatus,
  type OnboardingCompleteRequest,
} from "@leanient/shared";
import type { OnboardingDraft } from "./draft";

// Daily protein/calorie targets are NOT computed here anymore. The backend owns
// them (Mifflin-St Jeor) as the single source of truth. We submit the raw inputs
// (sex, age, height in inches) and the server returns the computed profile.

/** Resolve the device timezone (IANA), falling back to UTC. */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

class IncompleteOnboardingError extends Error {
  constructor(field: string) {
    super(`Onboarding draft is missing a required field: ${field}`);
    this.name = "IncompleteOnboardingError";
  }
}

/**
 * Assemble a draft into the exact shared `OnboardingCompleteRequest`. Throws if a
 * required slot has not been filled yet (called only from the Crafting screen,
 * once every screen has run). The `basics` slice (sex/age/height) IS sent now, as
 * raw inputs the backend uses to compute the calorie/protein targets.
 *
 * The return type is the shared request, so this function is the single, typed
 * boundary between the in-flight draft and the API.
 */
export function toOnboardingCompleteRequest(draft: OnboardingDraft): OnboardingCompleteRequest {
  const { profile, medicationProtocol: med, initialWeight } = draft;

  if (!profile.journeyStage) throw new IncompleteOnboardingError("profile.journeyStage");
  if (profile.goalWeight == null) throw new IncompleteOnboardingError("profile.goalWeight");
  if (!profile.goalWeightUnit) throw new IncompleteOnboardingError("profile.goalWeightUnit");
  if (!profile.goalPace) throw new IncompleteOnboardingError("profile.goalPace");
  if (!profile.biggestFear) throw new IncompleteOnboardingError("profile.biggestFear");
  if (!profile.trainingStatus) throw new IncompleteOnboardingError("profile.trainingStatus");

  if (!med.medicationName) throw new IncompleteOnboardingError("medicationProtocol.medicationName");
  if (!med.doseUnit) throw new IncompleteOnboardingError("medicationProtocol.doseUnit");
  if (!med.shotDay) throw new IncompleteOnboardingError("medicationProtocol.shotDay");
  if (!med.startDate) throw new IncompleteOnboardingError("medicationProtocol.startDate");

  if (!initialWeight || initialWeight.value == null) {
    throw new IncompleteOnboardingError("initialWeight.value");
  }
  if (!initialWeight.unit) throw new IncompleteOnboardingError("initialWeight.unit");

  // Biological inputs for the backend calorie model. Required now: the server
  // cannot compute targets without them.
  const { sexAssignedAtBirth, age, heightValue, heightUnit } = draft.basics;
  if (!sexAssignedAtBirth) throw new IncompleteOnboardingError("basics.sex");
  if (age == null) throw new IncompleteOnboardingError("basics.age");
  if (heightValue == null) throw new IncompleteOnboardingError("basics.heightValue");
  if (!heightUnit) throw new IncompleteOnboardingError("basics.heightUnit");

  // Convert height to inches at the contract boundary (backend expects inches).
  const heightInches =
    heightUnit === "cm" ? Math.round((heightValue / 2.54) * 10) / 10 : heightValue;

  return {
    profile: {
      journeyStage: profile.journeyStage,
      goalWeight: profile.goalWeight,
      goalWeightUnit: profile.goalWeightUnit,
      goalPace: profile.goalPace,
      biggestFear: profile.biggestFear,
      trainingStatus: profile.trainingStatus,
      equipmentAccess:
        profile.equipmentAccess ?? inferEquipmentAccessFromTrainingStatus(profile.trainingStatus),
      weeklyWorkoutTarget: computeWeeklyWorkoutTarget(profile.trainingStatus),
      sideEffectBaseline: profile.sideEffectBaseline ?? [],
      timezone: profile.timezone ?? deviceTimezone(),
      // Backend computes dailyProteinTarget/dailyCalorieTarget from these.
      sex: sexAssignedAtBirth,
      ageYears: age,
      heightInches,
    },
    medicationProtocol: {
      medicationCatalogId: med.medicationCatalogId,
      medicationName: med.medicationName,
      customMedicationName: med.customMedicationName,
      doseAmount: med.doseAmount,
      doseUnit: med.doseUnit,
      shotDay: med.shotDay,
      startDate: med.startDate,
      notes: med.notes,
      active: med.active ?? true,
    },
    initialWeight: {
      value: initialWeight.value,
      unit: initialWeight.unit,
      measuredAt: initialWeight.measuredAt ?? new Date().toISOString(),
    },
  };
}
