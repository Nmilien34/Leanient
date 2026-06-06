import type { OnboardingCompleteRequest } from "@leanient/shared";
import { NUTRITION_ENGINE_VERSION } from "@leanient/shared";
import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { NotFoundError, ValidationError } from "../lib/errors";
import { computeNutritionTargets, lbFromWeight } from "../lib/nutrition";
import { normalizeProfileTrainingFields } from "../lib/training";
import { startOfUtcWeek, toDateOnly } from "../lib/week";
import { MedicationCatalogItemModel } from "../models/medicationCatalogItem.model";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WeightLogModel } from "../models/weightLog.model";
import {
  serializeMedicationProtocol,
  serializeUserProfile,
  serializeWeightLog,
} from "./serializers";
import { serializeUser } from "./user.service";

const LEGACY_MEDICATION_ID_TO_CATALOG_SLUG: Record<string, string> = {
  med_ozempic: "semaglutide",
  med_wegovy: "semaglutide",
  ozempic: "semaglutide",
  wegovy: "semaglutide",
  med_mounjaro: "tirzepatide",
  med_zepbound: "tirzepatide",
  mounjaro: "tirzepatide",
  zepbound: "tirzepatide",
  med_compounded: "other",
  compounded: "other",
};

async function resolveMedicationCatalogId(
  medicationCatalogId: string | undefined,
  session: ClientSession,
) {
  if (!medicationCatalogId) {
    return undefined;
  }

  if (/^[a-f\d]{24}$/i.test(medicationCatalogId)) {
    return medicationCatalogId;
  }

  const normalized = medicationCatalogId.trim().toLowerCase();
  const slug = LEGACY_MEDICATION_ID_TO_CATALOG_SLUG[normalized] ?? normalized.replace(/^med_/, "");
  const catalogItem = await MedicationCatalogItemModel.findOne({ slug, active: true }).session(
    session,
  );

  if (!catalogItem) {
    throw new ValidationError("Medication catalog item not found", {
      medicationCatalogId,
    });
  }

  return catalogItem._id;
}

async function findCompletedOnboardingState(userId: string, session: ClientSession | null) {
  const [user, profile, medicationProtocol, weightLog] = await Promise.all([
    UserModel.findById(userId).session(session),
    UserProfileModel.findOne({ userId }).session(session),
    UserMedicationProtocolModel.findOne({ userId }).session(session),
    WeightLogModel.findOne({ userId, source: "onboarding" }).session(session),
  ]);

  if (!user || !profile || !medicationProtocol || !weightLog) {
    return null;
  }

  return {
    user: serializeUser(user),
    profile: serializeUserProfile(profile),
    medicationProtocol: serializeMedicationProtocol(medicationProtocol),
    weightLog: serializeWeightLog(weightLog),
  };
}

export async function completeOnboarding(userId: string, body: OnboardingCompleteRequest) {
  const existingUser = await UserModel.findById(userId).session(null);

  if (existingUser?.onboardingComplete) {
    const completedState = await findCompletedOnboardingState(userId, null);

    if (completedState) {
      return completedState;
    }
  }

  return mongoose.connection.transaction(async (session) => {
    const completedAt = new Date();
    const weekOf = toDateOnly(startOfUtcWeek(completedAt));
    // Backend owns nutrition targets (single source of truth). The frontend sends
    // raw sex/age/height; we compute protein + calories via Mifflin-St Jeor here.
    const targets = computeNutritionTargets({
      currentWeightLb: lbFromWeight(body.initialWeight.value, body.initialWeight.unit),
      goalWeightLb: lbFromWeight(body.profile.goalWeight, body.profile.goalWeightUnit),
      goalPace: body.profile.goalPace,
      sex: body.profile.sex,
      ageYears: body.profile.ageYears,
      heightInches: body.profile.heightInches,
      trainingStatus: body.profile.trainingStatus,
    });
    const profileFields = {
      ...body.profile,
      ...normalizeProfileTrainingFields({
        trainingStatus: body.profile.trainingStatus,
        equipmentAccess: body.profile.equipmentAccess,
        weeklyWorkoutTarget: body.profile.weeklyWorkoutTarget,
      }),
      dailyProteinTarget: targets.dailyProteinTarget,
      dailyCalorieTarget: targets.dailyCalorieTarget,
      nutritionEngineVersion: NUTRITION_ENGINE_VERSION,
    };
    const medicationCatalogId = await resolveMedicationCatalogId(
      body.medicationProtocol.medicationCatalogId,
      session,
    );
    const medicationProtocolFields = {
      ...body.medicationProtocol,
      ...(medicationCatalogId ? { medicationCatalogId } : {}),
    };

    const profile = await UserProfileModel.findOneAndUpdate(
      { userId },
      { $set: profileFields },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );
    const medicationProtocol = await UserMedicationProtocolModel.findOneAndUpdate(
      { userId },
      { $set: medicationProtocolFields },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );
    const weightLog = await WeightLogModel.findOneAndUpdate(
      { userId, weekOf },
      {
        $set: {
          userId,
          weekOf,
          value: body.initialWeight.value,
          unit: body.initialWeight.unit,
          measuredAt: new Date(body.initialWeight.measuredAt),
          source: "onboarding",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      },
    );
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          onboardingComplete: true,
          onboardingCompletedAt: completedAt,
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      },
    );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return {
      user: serializeUser(user),
      profile: serializeUserProfile(profile),
      medicationProtocol: serializeMedicationProtocol(medicationProtocol),
      weightLog: serializeWeightLog(weightLog),
    };
  });
}
