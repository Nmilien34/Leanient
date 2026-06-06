import type { DoseLog, TrainingTodayResponse, UserMedicationProtocol, Weekday } from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { deriveEnergyFromCheckin } from "../lib/energy";
import { computeShotDayContext } from "../lib/shotDay";
import { startOfUtcWeek } from "../lib/week";
import { DoseLogModel } from "../models/doseLog.model";
import { UserModel } from "../models/user.model";
import { resolveShotDays, UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import {
  generateWorkoutRecommendationCopy,
  WORKOUT_RECOMMENDATION_COPY_VERSION,
} from "./coachContent.service";
import { logger } from "../lib/logger";
import {
  recommendFeaturedWorkout,
  RECOMMENDATION_ENGINE_VERSION,
  WorkoutRecommendationError,
} from "./workoutRecommendation.service";
import { getUserProfileDocument } from "./userProfile.service";

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toProtocol(protocol: {
  _id?: unknown;
  userId?: unknown;
  medicationCatalogId?: unknown;
  medicationName: string;
  customMedicationName?: string;
  doseAmount?: number;
  doseUnit: UserMedicationProtocol["doseUnit"];
  shotDays: UserMedicationProtocol["shotDays"];
  shotDay?: Weekday;
  startDate: string;
  notes?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}): UserMedicationProtocol {
  return {
    id: protocol._id?.toString?.() ?? "protocol",
    userId: protocol.userId?.toString?.() ?? "user",
    medicationCatalogId: protocol.medicationCatalogId?.toString?.(),
    medicationName: protocol.medicationName,
    customMedicationName: protocol.customMedicationName,
    doseAmount: protocol.doseAmount,
    doseUnit: protocol.doseUnit,
    shotDays: resolveShotDays(protocol),
    startDate: protocol.startDate,
    notes: protocol.notes,
    active: protocol.active,
    createdAt: (protocol.createdAt ?? new Date()).toISOString(),
    updatedAt: (protocol.updatedAt ?? new Date()).toISOString(),
  };
}

function toDoseLog(dose: {
  _id?: unknown;
  userId?: unknown;
  recordedAt: Date | string;
  medicationProtocolId?: unknown;
  doseAmount: number;
  doseUnit: DoseLog["doseUnit"];
  injectionSite?: DoseLog["injectionSite"];
  notes?: string;
  deletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): DoseLog {
  const recordedAt = new Date(dose.recordedAt);
  return {
    id: dose._id?.toString?.() ?? "dose",
    userId: dose.userId?.toString?.() ?? "user",
    recordedAt: recordedAt.toISOString(),
    medicationProtocolId: dose.medicationProtocolId?.toString?.() ?? "protocol",
    doseAmount: dose.doseAmount,
    doseUnit: dose.doseUnit,
    injectionSite: dose.injectionSite,
    notes: dose.notes,
    deletedAt: dose.deletedAt ? new Date(dose.deletedAt).toISOString() : null,
    createdAt: dose.createdAt ? new Date(dose.createdAt).toISOString() : recordedAt.toISOString(),
    updatedAt: dose.updatedAt ? new Date(dose.updatedAt).toISOString() : recordedAt.toISOString(),
  };
}

export async function getTrainingToday(
  userId: string,
  now = new Date(),
): Promise<TrainingTodayResponse> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.onboardingComplete) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before using training recommendations",
      statusCode: 403,
    });
  }

  const weekStart = startOfUtcWeek(now);
  const nextWeekStart = addUtcDays(weekStart, 7);
  const recentStart = addUtcDays(now, -7);
  const doseStart = addUtcDays(now, -14);

  const [profile, protocol, doseLogs, recentCheckin, recentWorkoutLogs, sessionsThisWeek] =
    await Promise.all([
      getUserProfileDocument(userId).catch((error) => {
        if (error instanceof NotFoundError) {
          return null;
        }

        throw error;
      }),
      UserMedicationProtocolModel.findOne({ userId, active: true }),
      DoseLogModel.find({
        userId,
        deletedAt: null,
        recordedAt: { $gte: doseStart, $lte: now },
      }).sort({ recordedAt: -1 }),
      WeeklyCheckinModel.findOne({ userId }).sort({ weekOf: -1 }),
      WorkoutLogModel.find({
        userId,
        deletedAt: null,
        recordedAt: { $gte: recentStart, $lte: now },
      }),
      WorkoutLogModel.countDocuments({
        userId,
        deletedAt: null,
        recordedAt: { $gte: weekStart, $lt: nextWeekStart },
      }),
    ]);

  if (!profile) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before using training recommendations",
      statusCode: 403,
    });
  }

  const fullShotDayContext = computeShotDayContext(
    protocol ? toProtocol(protocol) : null,
    doseLogs.map(toDoseLog),
    now,
  );
  const shotDayContext = {
    isOnProtocol: fullShotDayContext.isOnProtocol,
    shotDayLabel: fullShotDayContext.shotDayLabel,
    daysUntilNextDose: fullShotDayContext.daysUntilNextDose,
  };
  const weeklyTarget = profile.weeklyWorkoutTarget;
  const energy = deriveEnergyFromCheckin(recentCheckin, profile);

  try {
    const recommendation = await recommendFeaturedWorkout({
      userId,
      shotDayContext: fullShotDayContext,
      energy,
      sessionsThisWeek,
      weeklyTarget,
      recentWorkoutLogs,
      userProfile: {
        equipmentAccess: profile.equipmentAccess,
        biggestFear: profile.biggestFear,
      },
    });

    let coachCopy: string | null = null;
    let coachCopyVersion: string | null = null;

    try {
      const generatedCopy = await generateWorkoutRecommendationCopy({
        workoutTitle: recommendation.workout.title,
        durationMinutes: recommendation.workout.durationMinutes,
        equipment: recommendation.workout.equipment,
        intensity: recommendation.workout.intensity,
        muscleGroups: recommendation.workout.muscleGroups,
        shotDayLabel: shotDayContext.shotDayLabel,
        energy,
        sessionsThisWeek,
        weeklyTarget,
        selectionReason: recommendation.selectionReason,
        biggestFear: profile.biggestFear,
      });
      coachCopy = generatedCopy.copy;
      coachCopyVersion = generatedCopy.copyVersion;
    } catch (error) {
      logger.warn({ error, userId }, "[training] workout coach copy unavailable");
    }

    return {
      sessionsThisWeek,
      weeklyTarget,
      shotDayContext,
      featuredWorkout: {
        workout: recommendation.workout,
        selectionReason: recommendation.selectionReason,
        coachCopy,
        coachCopyVersion: coachCopyVersion ?? (coachCopy ? WORKOUT_RECOMMENDATION_COPY_VERSION : null),
      },
      recommendationEngineVersion: RECOMMENDATION_ENGINE_VERSION,
    };
  } catch (error) {
    if (error instanceof WorkoutRecommendationError) {
      logger.warn({ error, userId }, "[training] no eligible featured workout");
      return {
        sessionsThisWeek,
        weeklyTarget,
        shotDayContext,
        featuredWorkout: null,
        recommendationEngineVersion: RECOMMENDATION_ENGINE_VERSION,
      };
    }

    throw error;
  }
}
