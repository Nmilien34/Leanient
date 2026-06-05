import { randomUUID } from "node:crypto";
import type {
  MealScanAnalysis,
  MealScanCoachContent,
  MealScanImageMimeType,
  MealScanRequestBody,
  MealScanResponse,
} from "@leanient/shared";
import { ERROR_CODES, mealScanRequestSchema } from "@leanient/shared";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { startOfUtcWeek } from "../lib/week";
import { MealLogModel } from "../models/mealLog.model";
import { MealScanModel, type MealScanDocument } from "../models/mealScan.model";
import { UserProfileModel, type UserProfileDocument } from "../models/userProfile.model";
import {
  CoachContentError,
  generateMealScanCoachContent,
  generateMealScanVision,
  MEAL_SCAN_COACH_COPY_VERSION,
  MEAL_SCAN_VISION_COPY_VERSION,
  type MealScanProteinSnapshot,
} from "./coachContent.service";
import { serializeMealScan } from "./serializers";
import { putS3Object } from "./s3.service";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PROTEIN_ON_TRACK_THRESHOLD = 0.8;

export function buildMealScanObjectKey(userId: string, uploadId = randomUUID()): string {
  return `meal-scans/${userId}/${uploadId}.jpg`;
}

function invalidImage(message: string): AppError {
  return new AppError({
    code: ERROR_CODES.invalidImage,
    message,
    statusCode: 400,
    details: { retryable: false },
  });
}

function storageFailed(): AppError {
  return new AppError({
    code: ERROR_CODES.mealScanStorageFailed,
    message: "Meal scan photo storage failed",
    statusCode: 503,
    details: { retryable: true },
    expose: true,
  });
}

function visionFailed(): AppError {
  return new AppError({
    code: ERROR_CODES.mealScanVisionFailed,
    message: "Meal scan vision analysis failed",
    statusCode: 503,
    details: { retryable: true },
    expose: true,
  });
}

function isDuplicateIdempotencyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: number;
    keyPattern?: Record<string, unknown>;
  };

  return (
    candidate.code === 11000 &&
    Boolean(candidate.keyPattern?.userId) &&
    Boolean(candidate.keyPattern?.idempotencyKey)
  );
}

function decodeAndValidateImage(
  imageData: string,
  imageMimeType: MealScanImageMimeType,
): Buffer {
  const normalized = imageData.trim();
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw invalidImage("imageData must be valid base64");
  }

  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) {
    throw invalidImage("imageData must decode to a non-empty image");
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw invalidImage("Meal scan image must be 10 MB or smaller");
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  if (imageMimeType === "image/jpeg" && !isJpeg) {
    throw invalidImage("imageData must be a JPEG image");
  }

  if (imageMimeType === "image/png" && !isPng) {
    throw invalidImage("imageData must be a PNG image");
  }

  return bytes;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

async function findSuccessfulIdempotentScan(
  userId: string,
  idempotencyKey?: string,
): Promise<MealScanDocument | null> {
  if (!idempotencyKey) {
    return null;
  }

  const existing = await MealScanModel.findOne({
    userId,
    idempotencyKey,
  });

  return existing?.analysis ? existing : null;
}

async function computeProteinSnapshot(input: {
  userId: string;
  capturedAt: Date;
  analysis: MealScanAnalysis;
  profile: UserProfileDocument;
}): Promise<{
  snapshot: MealScanProteinSnapshot;
  biggestFear: string;
}> {
  const todayStart = startOfUtcDay(input.capturedAt);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const weekStart = startOfUtcWeek(input.capturedAt);
  const elapsedWeekDays =
    Math.floor((todayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const [todayLogs, weekLogs] = await Promise.all([
    MealLogModel.find({
      userId: input.userId,
      deletedAt: null,
      recordedAt: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    }).select("protein"),
    MealLogModel.find({
      userId: input.userId,
      deletedAt: null,
      recordedAt: {
        $gte: weekStart,
        $lt: tomorrowStart,
      },
    }).select("protein"),
  ]);

  const todayProteinLogged = todayLogs.reduce((total, log) => total + log.protein, 0);
  const weekProteinLogged = weekLogs.reduce((total, log) => total + log.protein, 0);
  const projectedProtein = todayProteinLogged + input.analysis.protein;
  const projectedRatio = projectedProtein / input.profile.dailyProteinTarget;
  const mode = projectedRatio >= PROTEIN_ON_TRACK_THRESHOLD ? "affirmation" : "swap";

  return {
    snapshot: {
      todayProteinLogged: roundOne(todayProteinLogged),
      todayProteinTarget: input.profile.dailyProteinTarget,
      todayPercent: Math.round((todayProteinLogged / input.profile.dailyProteinTarget) * 100),
      projectedProtein: roundOne(projectedProtein),
      projectedPercent: Math.round(projectedRatio * 100),
      weekAdherence: Math.round(
        (weekProteinLogged / (input.profile.dailyProteinTarget * elapsedWeekDays)) * 100,
      ),
      calorieTarget: input.profile.dailyCalorieTarget,
      mode,
    },
    biggestFear: input.profile.biggestFear,
  };
}

async function getProfileWithTargets(userId: string): Promise<UserProfileDocument> {
  const profile = await UserProfileModel.findOne({ userId });

  if (!profile?.dailyProteinTarget || !profile?.dailyCalorieTarget) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete nutrition targets before scanning meals",
      statusCode: 400,
    });
  }

  return profile;
}

function withAdjustedMacros(
  analysis: MealScanAnalysis,
  coachContent: Awaited<ReturnType<typeof generateMealScanCoachContent>>,
): MealScanCoachContent {
  return {
    mode: coachContent.mode,
    callout: coachContent.callout,
    copyVersion: MEAL_SCAN_COACH_COPY_VERSION,
    swap: coachContent.swap
      ? {
          ...coachContent.swap,
          adjustedMacros: {
            protein: roundOne(analysis.protein + coachContent.swap.additionalProtein),
            calories: roundOne(analysis.calories + coachContent.swap.additionalCalories),
            carbs: analysis.carbs,
            fat: analysis.fat,
          },
        }
      : null,
  };
}

async function persistSuccessfulScan(input: {
  existingIncompleteScan: MealScanDocument | null;
  userId: string;
  photoS3Key: string;
  imageMimeType: MealScanImageMimeType;
  analysis: MealScanAnalysis;
  coachContent: MealScanCoachContent | null;
  idempotencyKey?: string;
}): Promise<MealScanDocument> {
  const payload = {
    userId: input.userId,
    photoS3Key: input.photoS3Key,
    imageMimeType: input.imageMimeType,
    analysis: input.analysis,
    coachContent: input.coachContent,
    idempotencyKey: input.idempotencyKey,
    visionEngineVersion: MEAL_SCAN_VISION_COPY_VERSION,
    coachContentVersion: input.coachContent?.copyVersion ?? null,
  };

  if (input.existingIncompleteScan) {
    const updated = await MealScanModel.findOneAndUpdate(
      {
        _id: input.existingIncompleteScan._id,
        userId: input.userId,
      },
      { $set: payload },
      { new: true, runValidators: true },
    );

    if (updated) {
      return updated;
    }
  }

  return MealScanModel.create(payload);
}

export async function analyzeMealScan(
  userId: string,
  body: MealScanRequestBody,
): Promise<MealScanResponse> {
  const request = mealScanRequestSchema.parse(body);
  const imageBytes = decodeAndValidateImage(request.imageData, request.imageMimeType);
  const capturedAt = request.capturedAt ? new Date(request.capturedAt) : new Date();

  const existing = request.idempotencyKey
    ? await MealScanModel.findOne({ userId, idempotencyKey: request.idempotencyKey })
    : null;

  if (existing?.analysis) {
    return serializeMealScan(existing);
  }

  const profile = await getProfileWithTargets(userId);
  const photoS3Key = buildMealScanObjectKey(userId);
  try {
    await putS3Object({
      key: photoS3Key,
      body: imageBytes,
      contentType: request.imageMimeType,
    });
  } catch (error) {
    logger.warn({ error, userId }, "[meal-scan] S3 upload failed");
    throw storageFailed();
  }

  let analysis: MealScanAnalysis;
  try {
    analysis = await generateMealScanVision(request.imageData.trim(), request.imageMimeType);
  } catch (error) {
    logger.warn({ error, userId, photoS3Key }, "[meal-scan] vision analysis failed");
    throw visionFailed();
  }

  const { snapshot, biggestFear } = await computeProteinSnapshot({
    userId,
    capturedAt,
    analysis,
    profile,
  });

  let coachContent: MealScanCoachContent | null = null;
  try {
    const generated = await generateMealScanCoachContent(analysis, snapshot, { biggestFear });
    coachContent = withAdjustedMacros(analysis, generated);
  } catch (error) {
    if (error instanceof CoachContentError) {
      logger.warn({ error, userId, photoS3Key }, "[meal-scan] coach content unavailable");
    } else {
      logger.warn({ error, userId, photoS3Key }, "[meal-scan] coach content failed");
    }
  }

  try {
    const scan = await persistSuccessfulScan({
      existingIncompleteScan: existing?.analysis ? null : existing,
      userId,
      photoS3Key,
      imageMimeType: request.imageMimeType,
      analysis,
      coachContent,
      idempotencyKey: request.idempotencyKey,
    });

    return serializeMealScan(scan);
  } catch (error) {
    if (request.idempotencyKey && isDuplicateIdempotencyError(error)) {
      const idempotentScan = await findSuccessfulIdempotentScan(userId, request.idempotencyKey);
      if (idempotentScan) {
        return serializeMealScan(idempotentScan);
      }
    }

    throw error;
  }
}
