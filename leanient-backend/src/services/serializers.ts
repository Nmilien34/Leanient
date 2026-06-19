import type {
  MedicationCatalogItem,
  DoseLog,
  MealLog,
  MealScanResponse,
  MeasurementLog,
  MuscleRetentionSnapshot,
  ProgressPhoto,
  SideEffectLog,
  UserMedicationProtocol,
  UserProfile,
  WeightLog,
  WeeklyCheckin,
  WeeklyVerdict,
  Workout,
  WorkoutLog,
} from "@leanient/shared";
import { NUTRITION_ENGINE_VERSION_LEGACY } from "@leanient/shared";
import type { DoseLogDocument } from "../models/doseLog.model";
import type { MealLogDocument } from "../models/mealLog.model";
import type { MealScanDocument } from "../models/mealScan.model";
import type { MeasurementLogDocument } from "../models/measurementLog.model";
import type { MedicationCatalogItemDocument } from "../models/medicationCatalogItem.model";
import type { MuscleRetentionSnapshotDocument } from "../models/muscleRetentionSnapshot.model";
import type { ProgressPhotoDocument } from "../models/progressPhoto.model";
import type { SideEffectLogDocument } from "../models/sideEffectLog.model";
import {
  resolveShotDays,
  type UserMedicationProtocolDocument,
} from "../models/userMedicationProtocol.model";
import type { UserProfileDocument } from "../models/userProfile.model";
import type { WeightLogDocument } from "../models/weightLog.model";
import type { WeeklyCheckinDocument } from "../models/weeklyCheckin.model";
import type { WeeklyVerdictDocument } from "../models/weeklyVerdict.model";
import type { WorkoutDocument } from "../models/workout.model";
import type { WorkoutLogDocument } from "../models/workoutLog.model";

export function serializeUserProfile(profile: UserProfileDocument): UserProfile {
  // Legacy profiles may lack the Mifflin inputs. Flag those so the app can prompt
  // the user to supply them; without all three, the current targets are stale.
  const hasNutritionInputs =
    profile.sex != null && profile.ageYears != null && profile.heightInches != null;

  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
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
    sex: profile.sex,
    ageYears: profile.ageYears,
    heightInches: profile.heightInches,
    nutritionEngineVersion: profile.nutritionEngineVersion ?? NUTRITION_ENGINE_VERSION_LEGACY,
    ...(hasNutritionInputs ? {} : { needsNutritionInputUpdate: true }),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeMedicationProtocol(
  protocol: UserMedicationProtocolDocument,
): UserMedicationProtocol {
  return {
    id: protocol._id.toString(),
    userId: protocol.userId.toString(),
    medicationCatalogId: protocol.medicationCatalogId?.toString(),
    medicationName: protocol.medicationName,
    customMedicationName: protocol.customMedicationName,
    doseAmount: protocol.doseAmount,
    doseUnit: protocol.doseUnit,
    shotDays: resolveShotDays(protocol),
    startDate: protocol.startDate,
    notes: protocol.notes,
    active: protocol.active,
    createdAt: protocol.createdAt.toISOString(),
    updatedAt: protocol.updatedAt.toISOString(),
  };
}

export function serializeWeightLog(weightLog: WeightLogDocument): WeightLog {
  return {
    id: weightLog._id.toString(),
    userId: weightLog.userId.toString(),
    value: weightLog.value,
    unit: weightLog.unit,
    measuredAt: weightLog.measuredAt.toISOString(),
    source: weightLog.source,
    weeklyCheckinId: weightLog.weeklyCheckinId?.toString(),
    createdAt: weightLog.createdAt.toISOString(),
    updatedAt: weightLog.updatedAt.toISOString(),
  };
}

export function serializeMealLog(log: MealLogDocument): MealLog {
  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    recordedAt: log.recordedAt.toISOString(),
    idempotencyKey: log.idempotencyKey,
    deletedAt: log.deletedAt?.toISOString() ?? null,
    source: log.source,
    photoS3Key: log.photoS3Key,
    aiScanConfidence: log.aiScanConfidence,
    foodName: log.foodName,
    servingSize: log.servingSize,
    protein: log.protein,
    calories: log.calories,
    carbs: log.carbs,
    fat: log.fat,
    fiber: log.fiber,
    waterOz: log.waterOz,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function serializeMealScan(scan: MealScanDocument): MealScanResponse {
  if (!scan.analysis) {
    throw new Error("Cannot serialize incomplete meal scan");
  }

  return {
    scanId: scan._id.toString(),
    photoS3Key: scan.photoS3Key,
    analysis: scan.analysis,
    coachContent: scan.coachContent,
    visionEngineVersion: scan.visionEngineVersion,
  };
}

export function serializeWorkoutLog(log: WorkoutLogDocument): WorkoutLog {
  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    recordedAt: log.recordedAt.toISOString(),
    idempotencyKey: log.idempotencyKey,
    deletedAt: log.deletedAt?.toISOString() ?? null,
    workoutId: log.workoutId?.toString(),
    customWorkoutName: log.customWorkoutName,
    exercises: log.exercises,
    durationMinutes: log.durationMinutes,
    countsAsResistance: log.countsAsResistance ?? false,
    perceivedEffort: log.perceivedEffort,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function serializeDoseLog(log: DoseLogDocument): DoseLog {
  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    recordedAt: log.recordedAt.toISOString(),
    idempotencyKey: log.idempotencyKey,
    deletedAt: log.deletedAt?.toISOString() ?? null,
    medicationProtocolId: log.medicationProtocolId.toString(),
    doseAmount: log.doseAmount,
    doseUnit: log.doseUnit,
    injectionSite: log.injectionSite,
    painLevel: log.painLevel,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function serializeMeasurementLog(log: MeasurementLogDocument): MeasurementLog {
  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    recordedAt: log.recordedAt.toISOString(),
    idempotencyKey: log.idempotencyKey,
    deletedAt: log.deletedAt?.toISOString() ?? null,
    measurements: log.measurements,
    unit: log.unit,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function serializeSideEffectLog(log: SideEffectLogDocument): SideEffectLog {
  return {
    id: log._id.toString(),
    userId: log.userId.toString(),
    recordedAt: log.recordedAt.toISOString(),
    idempotencyKey: log.idempotencyKey,
    deletedAt: log.deletedAt?.toISOString() ?? null,
    symptom: log.symptom,
    customSymptom: log.customSymptom,
    severity: log.severity,
    durationHours: log.durationHours,
    relatedToDose: log.relatedToDose,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

export function serializeWeeklyCheckin(checkin: WeeklyCheckinDocument): WeeklyCheckin {
  return {
    id: checkin._id.toString(),
    userId: checkin.userId.toString(),
    weekOf: checkin.weekOf,
    weight: checkin.weight,
    proteinGramsPerDay: checkin.proteinGramsPerDay,
    resistanceWorkoutsCompleted: checkin.resistanceWorkoutsCompleted,
    sideEffects: checkin.sideEffects,
    notes: checkin.notes,
    userContextSnapshot: checkin.userContextSnapshot,
    weightLogId: checkin.weightLogId.toString(),
    createdAt: checkin.createdAt.toISOString(),
    updatedAt: checkin.updatedAt.toISOString(),
  };
}

export function serializeWeeklyVerdict(verdict: WeeklyVerdictDocument): WeeklyVerdict {
  return {
    id: verdict._id.toString(),
    userId: verdict.userId.toString(),
    weekOf: verdict.weekOf,
    checkinId: verdict.checkinId ? verdict.checkinId.toString() : null,
    source: verdict.source,
    engineVersion: verdict.engineVersion,
    copyVersion: verdict.copyVersion,
    explanation: verdict.explanation,
    status: verdict.status,
    score: verdict.score,
    estimatedLeanMassRisk: verdict.estimatedLeanMassRisk,
    nextActionCode: verdict.nextActionCode,
    headline: verdict.headline,
    message: verdict.message,
    explanationFactors: verdict.explanationFactors,
    inputsUsed: verdict.inputsUsed,
    createdAt: verdict.createdAt.toISOString(),
    updatedAt: verdict.updatedAt.toISOString(),
  };
}

export function serializeMuscleRetentionSnapshot(
  snapshot: MuscleRetentionSnapshotDocument,
): MuscleRetentionSnapshot {
  return {
    id: snapshot._id.toString(),
    userId: snapshot.userId.toString(),
    weekOf: snapshot.weekOf.toISOString(),
    proteinScore: snapshot.proteinScore,
    trainingScore: snapshot.trainingScore,
    paceScore: snapshot.paceScore,
    muscleRetentionScore: snapshot.muscleRetentionScore,
    retentionLabel: snapshot.retentionLabel,
    weeklyWeightLossLb: snapshot.weeklyWeightLossLb,
    cumulativeWeightLossLb: snapshot.cumulativeWeightLossLb,
    inputsUsed: snapshot.inputsUsed,
    engineVersion: snapshot.engineVersion,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function serializeWorkout(workout: WorkoutDocument): Workout {
  return {
    id: workout._id.toString(),
    slug: workout.slug,
    title: workout.title,
    shortDescription: workout.shortDescription,
    focus: workout.focus,
    energyPhase: workout.energyPhase,
    durationMinutes: workout.durationMinutes,
    difficulty: workout.difficulty,
    equipment: workout.equipment,
    intensity: workout.intensity,
    muscleGroups: workout.muscleGroups,
    category: workout.category,
    exercises: workout.exercises,
    safetyNotes: workout.safetyNotes,
    tags: workout.tags,
    version: workout.version,
    active: workout.active,
    createdAt: workout.createdAt.toISOString(),
    updatedAt: workout.updatedAt.toISOString(),
  };
}

export function serializeMedicationCatalogItem(
  medication: MedicationCatalogItemDocument,
): MedicationCatalogItem {
  return {
    id: medication._id.toString(),
    slug: medication.slug,
    genericName: medication.genericName,
    brandNames: medication.brandNames,
    drugClass: medication.drugClass,
    doseUnits: medication.doseUnits,
    supportedDoseValues: medication.supportedDoseValues,
    active: medication.active,
    displayOrder: medication.displayOrder,
    createdAt: medication.createdAt.toISOString(),
    updatedAt: medication.updatedAt.toISOString(),
  };
}

export function serializeProgressPhoto(photo: ProgressPhotoDocument): ProgressPhoto {
  return {
    id: photo._id.toString(),
    userId: photo.userId.toString(),
    captureDate: photo.captureDate,
    s3Key: photo.s3Key,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
    status: photo.status,
    kind: photo.kind ?? "body",
    faceFullness: photo.faceFullness,
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
  };
}
