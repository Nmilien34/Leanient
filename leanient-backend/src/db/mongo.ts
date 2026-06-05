import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { withTimeout } from "../lib/timeout";
import { MedicationCatalogItemModel } from "../models/medicationCatalogItem.model";
import { DoseLogModel } from "../models/doseLog.model";
import { MealLogModel } from "../models/mealLog.model";
import { MealScanModel } from "../models/mealScan.model";
import { MeasurementLogModel } from "../models/measurementLog.model";
import { MuscleRetentionSnapshotModel } from "../models/muscleRetentionSnapshot.model";
import { ProgressPhotoModel } from "../models/progressPhoto.model";
import { SideEffectLogModel } from "../models/sideEffectLog.model";
import { SubscriptionEventModel } from "../models/subscriptionEvent.model";
import { TodaysFocusModel } from "../models/todaysFocus.model";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WeightLogModel } from "../models/weightLog.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import { WeeklyVerdictModel } from "../models/weeklyVerdict.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import { WorkoutModel } from "../models/workout.model";
import { seedMedicationCatalog } from "../services/medicationSeed.service";
import { seedWorkouts } from "../services/workout.service";

let listenersRegistered = false;

function registerConnectionListeners(): void {
  if (listenersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => logger.info("[db] MongoDB connected"));
  mongoose.connection.on("disconnected", () => logger.warn("[db] MongoDB disconnected"));
  mongoose.connection.on("error", (error) => {
    logger.error({ error }, "[db] MongoDB connection error");
  });

  listenersRegistered = true;
}

export async function connect(): Promise<void> {
  registerConnectionListeners();

  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  });

  await Promise.all([
    UserModel.createIndexes(),
    UserProfileModel.createIndexes(),
    UserMedicationProtocolModel.createIndexes(),
    WeightLogModel.createIndexes(),
    MealLogModel.createIndexes(),
    MealScanModel.createIndexes(),
    WorkoutLogModel.createIndexes(),
    DoseLogModel.createIndexes(),
    MeasurementLogModel.createIndexes(),
    SideEffectLogModel.createIndexes(),
    WeeklyCheckinModel.createIndexes(),
    WeeklyVerdictModel.createIndexes(),
    MuscleRetentionSnapshotModel.createIndexes(),
    TodaysFocusModel.createIndexes(),
    WorkoutModel.createIndexes(),
    MedicationCatalogItemModel.createIndexes(),
    ProgressPhotoModel.createIndexes(),
    SubscriptionEventModel.createIndexes(),
  ]);
  logger.info("[db] Mongo indexes ensured");

  const [medicationsSeeded, workoutsSeeded] = await Promise.all([
    seedMedicationCatalog(),
    seedWorkouts(),
  ]);
  logger.info({ medicationsSeeded, workoutsSeeded }, "[db] catalog seeds ensured");
}

export async function disconnect(): Promise<void> {
  await mongoose.disconnect();
}

export async function isDatabaseReachable(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return false;
  }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), 3000, "MongoDB ping");
    return true;
  } catch (error) {
    logger.warn({ error }, "[db] MongoDB health check failed");
    return false;
  }
}
