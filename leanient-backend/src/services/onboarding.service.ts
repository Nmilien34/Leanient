import type { OnboardingCompleteRequest } from "@leanient/shared";
import { NUTRITION_ENGINE_VERSION } from "@leanient/shared";
import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { NotFoundError } from "../lib/errors";
import { computeNutritionTargets, lbFromWeight } from "../lib/nutrition";
import { normalizeProfileTrainingFields } from "../lib/training";
import { startOfUtcWeek, toDateOnly } from "../lib/week";
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
      { $set: body.medicationProtocol },
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
