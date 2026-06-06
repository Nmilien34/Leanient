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

  // syncIndexes (not createIndexes) so schema index changes reconcile against
  // what already exists in the database. createIndexes only adds missing indexes
  // and throws IndexKeySpecsConflict when an index name exists with different
  // options (e.g. adding `unique` to revenueCatEventId). syncIndexes drops the
  // stale index and recreates it to match the schema.
  await Promise.all([
    UserModel.syncIndexes(),
    UserProfileModel.syncIndexes(),
    UserMedicationProtocolModel.syncIndexes(),
    WeightLogModel.syncIndexes(),
    MealLogModel.syncIndexes(),
    MealScanModel.syncIndexes(),
    WorkoutLogModel.syncIndexes(),
    DoseLogModel.syncIndexes(),
    MeasurementLogModel.syncIndexes(),
    SideEffectLogModel.syncIndexes(),
    WeeklyCheckinModel.syncIndexes(),
    WeeklyVerdictModel.syncIndexes(),
    MuscleRetentionSnapshotModel.syncIndexes(),
    TodaysFocusModel.syncIndexes(),
    WorkoutModel.syncIndexes(),
    MedicationCatalogItemModel.syncIndexes(),
    ProgressPhotoModel.syncIndexes(),
    SubscriptionEventModel.syncIndexes(),
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
