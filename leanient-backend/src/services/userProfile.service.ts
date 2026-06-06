import type { PatchUserProfileRequest, UserContextSnapshot } from "@leanient/shared";
import { NUTRITION_ENGINE_VERSION, NUTRITION_ENGINE_VERSION_LEGACY } from "@leanient/shared";
import { Types } from "mongoose";
import { NotFoundError, ValidationError } from "../lib/errors";
import { computeTargetsForProfile, lbFromWeight } from "../lib/nutrition";
import { normalizeProfileTrainingFields } from "../lib/training";
import { resolveShotDays, UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { UserProfileModel, type UserProfileDocument } from "../models/userProfile.model";
import { WeightLogModel } from "../models/weightLog.model";
import { serializeUserProfile } from "./serializers";

// Editable inputs that, when changed, invalidate the cached Mifflin-St Jeor
// targets and force a recompute. (Current weight is not a profile field; it comes
// from weight logs, so it is handled separately when logs are recomputed.)
const NUTRITION_INPUT_KEYS = [
  "sex",
  "ageYears",
  "heightInches",
  "goalPace",
  "trainingStatus",
] as const satisfies readonly (keyof PatchUserProfileRequest)[];

export async function getUserProfileDocument(userId: string): Promise<UserProfileDocument> {
  const profile = await UserProfileModel.findOne({ userId });

  if (!profile) {
    throw new NotFoundError("User profile not found");
  }

  return ensureProfileLazyFields(userId, profile);
}

/**
 * Lazily backfill fields added after a profile was first written:
 *  - training defaults (equipmentAccess / weeklyWorkoutTarget)
 *  - nutritionEngineVersion (legacy profiles predate the Mifflin engine, so they
 *    are stamped v1 to mark their targets as produced by the old heuristic)
 *
 * Nutrition inputs (sex/age/height) are deliberately NOT fabricated here. Missing
 * inputs surface via `needsNutritionInputUpdate` in the serializer so the app can
 * prompt the user, rather than computing targets from made-up defaults.
 */
async function ensureProfileLazyFields(
  userId: string,
  profile: UserProfileDocument,
): Promise<UserProfileDocument> {
  // Legacy docs may be missing these despite the type marking them required.
  const maybe = profile as UserProfileDocument & {
    equipmentAccess?: UserProfileDocument["equipmentAccess"];
    weeklyWorkoutTarget?: UserProfileDocument["weeklyWorkoutTarget"];
  };
  const needsTraining = !(maybe.equipmentAccess && maybe.weeklyWorkoutTarget);
  const needsVersion = !maybe.nutritionEngineVersion;

  if (!needsTraining && !needsVersion) {
    return profile;
  }

  const set = {
    ...(needsTraining
      ? normalizeProfileTrainingFields({
          trainingStatus: profile.trainingStatus,
          equipmentAccess: maybe.equipmentAccess,
          weeklyWorkoutTarget: maybe.weeklyWorkoutTarget,
        })
      : {}),
    ...(needsVersion ? { nutritionEngineVersion: NUTRITION_ENGINE_VERSION_LEGACY } : {}),
  };

  const migrated = await UserProfileModel.findOneAndUpdate(
    { userId },
    { $set: set },
    { new: true, runValidators: true },
  );

  if (!migrated) {
    throw new NotFoundError("User profile not found");
  }

  return migrated;
}

/** Latest logged weight in pounds, falling back to goal weight when no logs exist. */
async function currentWeightLb(
  userId: string,
  fallbackWeight: number,
  fallbackUnit: UserProfileDocument["goalWeightUnit"],
): Promise<number> {
  const latest = await WeightLogModel.findOne({ userId }).sort({ measuredAt: -1 });
  return latest ? lbFromWeight(latest.value, latest.unit) : lbFromWeight(fallbackWeight, fallbackUnit);
}

export async function getUserProfile(
  userId: string,
): Promise<ReturnType<typeof serializeUserProfile>> {
  return serializeUserProfile(await getUserProfileDocument(userId));
}

export async function patchUserProfile(
  userId: string,
  patch: PatchUserProfileRequest,
): Promise<ReturnType<typeof serializeUserProfile>> {
  const existing = await getUserProfileDocument(userId);

  const normalizedPatch = {
    ...patch,
    ...(patch.trainingStatus
      ? normalizeProfileTrainingFields({
          trainingStatus: patch.trainingStatus,
          equipmentAccess: patch.equipmentAccess,
          weeklyWorkoutTarget: patch.weeklyWorkoutTarget,
        })
      : {}),
  };

  // If the patch touches any Mifflin input, recompute targets against the merged
  // profile + the latest logged weight. Recompute only succeeds when all of
  // sex/age/height are present (after the patch); otherwise targets are left as-is.
  let nutritionPatch: Record<string, unknown> = {};
  if (NUTRITION_INPUT_KEYS.some((key) => key in patch)) {
    const merged = {
      sex: patch.sex ?? existing.sex,
      ageYears: patch.ageYears ?? existing.ageYears,
      heightInches: patch.heightInches ?? existing.heightInches,
      goalPace: patch.goalPace ?? existing.goalPace,
      goalWeight: patch.goalWeight ?? existing.goalWeight,
      goalWeightUnit: patch.goalWeightUnit ?? existing.goalWeightUnit,
      trainingStatus: normalizedPatch.trainingStatus ?? existing.trainingStatus,
    };
    const weightLb = await currentWeightLb(userId, merged.goalWeight, merged.goalWeightUnit);
    const targets = computeTargetsForProfile(merged, weightLb);
    if (targets) {
      nutritionPatch = {
        dailyProteinTarget: targets.dailyProteinTarget,
        dailyCalorieTarget: targets.dailyCalorieTarget,
        nutritionEngineVersion: NUTRITION_ENGINE_VERSION,
      };
    }
  }

  const profile = await UserProfileModel.findOneAndUpdate(
    { userId },
    { $set: { ...normalizedPatch, ...nutritionPatch } },
    { new: true, runValidators: true },
  );

  if (!profile) {
    throw new NotFoundError("User profile not found");
  }

  return serializeUserProfile(await ensureProfileLazyFields(userId, profile));
}

export async function buildUserContextSnapshot(userId: string): Promise<UserContextSnapshot> {
  const foundProfile = await UserProfileModel.findOne({ userId });

  if (!foundProfile) {
    throw new ValidationError("Complete onboarding before submitting a weekly check-in");
  }

  const profile = await ensureProfileLazyFields(userId, foundProfile);

  const protocol = await UserMedicationProtocolModel.findOne({
    userId,
    active: true,
  });
  const priorWeight = await WeightLogModel.findOne({ userId }).sort({ measuredAt: -1 });

  return {
    profile: {
      journeyStage: profile.journeyStage,
      goalWeight: profile.goalWeight,
      goalWeightUnit: profile.goalWeightUnit,
      dailyProteinTarget: profile.dailyProteinTarget,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      goalPace: profile.goalPace,
      biggestFear: profile.biggestFear,
      trainingStatus: profile.trainingStatus,
      equipmentAccess: profile.equipmentAccess,
      weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
      sideEffectBaseline: profile.sideEffectBaseline,
      timezone: profile.timezone,
    },
    medicationProtocol: protocol
      ? {
          medicationCatalogId: protocol.medicationCatalogId?.toString(),
          medicationName: protocol.medicationName,
          customMedicationName: protocol.customMedicationName,
          doseAmount: protocol.doseAmount,
          doseUnit: protocol.doseUnit,
          shotDays: resolveShotDays(protocol),
          startDate: protocol.startDate,
        }
      : undefined,
    priorWeight: priorWeight
      ? {
          value: priorWeight.value,
          unit: priorWeight.unit,
          measuredAt: priorWeight.measuredAt.toISOString(),
        }
      : undefined,
  };
}

export function toObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new ValidationError("Invalid id");
  }

  return new Types.ObjectId(value);
}
