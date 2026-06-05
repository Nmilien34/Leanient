import type {
  DoseLog,
  FocusCategory,
  TodaysFocusInputsSnapshot,
  TodaysFocusResponse,
  UserMedicationProtocol,
} from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { deriveEnergyFromCheckin } from "../lib/energy";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { ShotDayContext } from "../lib/shotDay";
import { computeShotDayContext } from "../lib/shotDay";
import { startOfUtcWeek } from "../lib/week";
import { DoseLogModel } from "../models/doseLog.model";
import { MealLogModel } from "../models/mealLog.model";
import {
  TodaysFocusModel,
  type TodaysFocusCoachContent,
  type TodaysFocusDocument,
} from "../models/todaysFocus.model";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import { generateTodaysFocusCopy } from "./coachContent.service";
import { getUserProfileDocument } from "./userProfile.service";

export type { FocusCategory, TodaysFocusActionType, TodaysFocusResponse } from "@leanient/shared";

export const TODAYS_FOCUS_ENGINE_VERSION = "v1.0";

export interface SelectFocusCategoryInput {
  userId: string;
  userProfile: {
    dailyProteinTarget: number;
    weeklyWorkoutTarget: number;
  };
  shotDayContext: ShotDayContext;
  energy: "good" | "mid" | "low" | null;
  recentMealLogs: Array<{
    protein: number;
    recordedAt: Date | string;
  }>;
  weekMealLogs: Array<{
    protein: number;
    recordedAt: Date | string;
  }>;
  recentWorkoutLogs: Array<{
    recordedAt: Date | string;
  }>;
  weekWorkoutLogs: Array<{
    recordedAt: Date | string;
  }>;
  recentCheckin: unknown | null;
  totalMealLogs: number;
  totalWorkoutLogs: number;
  utcNow: Date;
}

export interface SelectedFocusCategory {
  category: FocusCategory;
  selectionReason: string;
  inputsSnapshot: TodaysFocusInputsSnapshot;
}

const TRAINING_GAP_DAYS = new Set([0, 4, 5, 6]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return startOfUtcDay(left).getTime() === startOfUtcDay(right).getTime();
}

function toValidDate(value: Date | string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}

function currentWeekElapsedDays(utcNow: Date): number {
  const day = utcNow.getUTCDay();
  return day === 0 ? 7 : day;
}

function daysSinceMostRecentActivity(
  utcNow: Date,
  mealLogs: SelectFocusCategoryInput["recentMealLogs"],
  workoutLogs: SelectFocusCategoryInput["recentWorkoutLogs"],
): number | null {
  const dates = [...mealLogs, ...workoutLogs]
    .map((log) => toValidDate(log.recordedAt))
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => right.getTime() - left.getTime());

  if (dates.length === 0) {
    return null;
  }

  return Math.max(
    0,
    Math.floor((startOfUtcDay(utcNow).getTime() - startOfUtcDay(dates[0]).getTime()) / MS_PER_DAY),
  );
}

function computeInputsSnapshot(input: SelectFocusCategoryInput): TodaysFocusInputsSnapshot {
  const proteinLoggedToday = input.recentMealLogs.reduce((sum, log) => {
    const recordedAt = toValidDate(log.recordedAt);
    return recordedAt && isSameUtcDay(recordedAt, input.utcNow) ? sum + log.protein : sum;
  }, 0);

  return {
    proteinLoggedToday: roundOne(proteinLoggedToday),
    proteinTargetToday: input.userProfile.dailyProteinTarget,
    sessionsThisWeek: input.weekWorkoutLogs.length,
    weeklyTarget: input.userProfile.weeklyWorkoutTarget,
    shotDayLabel: input.shotDayContext.shotDayLabel,
    energy: input.energy,
    daysSinceLastActivity: daysSinceMostRecentActivity(
      input.utcNow,
      input.recentMealLogs,
      input.recentWorkoutLogs,
    ),
  };
}

function weeklyProteinAdherence(input: SelectFocusCategoryInput): number {
  const elapsedDays = currentWeekElapsedDays(input.utcNow);
  const denominator = input.userProfile.dailyProteinTarget * elapsedDays;

  if (denominator <= 0) {
    return 0;
  }

  const protein = input.weekMealLogs.reduce((sum, log) => sum + log.protein, 0);
  return protein / denominator;
}

function isShotDayRecoveryContext(input: SelectFocusCategoryInput): boolean {
  return (
    (input.shotDayContext.shotDayLabel === "SHOT DAY" ||
      input.shotDayContext.shotDayLabel === "SHOT DAY +1") &&
    (input.energy === "low" || input.energy === null)
  );
}

function isProteinGap(input: SelectFocusCategoryInput, snapshot: TodaysFocusInputsSnapshot): boolean {
  const todayGap =
    input.utcNow.getUTCHours() >= 11 &&
    snapshot.proteinLoggedToday < snapshot.proteinTargetToday * 0.6;
  const weekGap = weeklyProteinAdherence(input) < 0.75;

  return todayGap || weekGap;
}

export async function selectFocusCategory(
  input: SelectFocusCategoryInput,
): Promise<SelectedFocusCategory> {
  const inputsSnapshot = computeInputsSnapshot(input);

  if (input.totalMealLogs === 0 && input.totalWorkoutLogs === 0) {
    return {
      category: "onboarding_nudge",
      selectionReason: "user has zero meal logs and zero workout logs since joining",
      inputsSnapshot,
    };
  }

  if (isShotDayRecoveryContext(input)) {
    return {
      category: "shot_day_recovery",
      selectionReason: `user is on ${input.shotDayContext.shotDayLabel} with ${input.energy ?? "unknown"} energy`,
      inputsSnapshot,
    };
  }

  if (
    TRAINING_GAP_DAYS.has(input.utcNow.getUTCDay()) &&
    inputsSnapshot.sessionsThisWeek < inputsSnapshot.weeklyTarget
  ) {
    return {
      category: "training_gap",
      selectionReason: `user has ${inputsSnapshot.sessionsThisWeek} of ${inputsSnapshot.weeklyTarget} workouts completed Thursday or later`,
      inputsSnapshot,
    };
  }

  if (isProteinGap(input, inputsSnapshot)) {
    return {
      category: "protein_gap",
      selectionReason: `protein is behind target today or this week (${inputsSnapshot.proteinLoggedToday}g today of ${inputsSnapshot.proteinTargetToday}g)`,
      inputsSnapshot,
    };
  }

  return {
    category: "steady_state",
    selectionReason: "user is on pace with no high-priority gap today",
    inputsSnapshot,
  };
}

function toProtocol(protocol: {
  _id?: unknown;
  userId?: unknown;
  medicationCatalogId?: unknown;
  medicationName: string;
  customMedicationName?: string;
  doseAmount?: number;
  doseUnit: UserMedicationProtocol["doseUnit"];
  shotDay: UserMedicationProtocol["shotDay"];
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
    shotDay: protocol.shotDay,
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

function serializeTodaysFocus(focus: TodaysFocusDocument): TodaysFocusResponse {
  return {
    category: focus.category,
    headline: focus.coachContent?.headline ?? null,
    suggestion: focus.coachContent?.suggestion ?? null,
    actionType: focus.coachContent?.actionType ?? "none",
    actionLabel: focus.coachContent?.actionLabel ?? null,
    selectionReason: focus.selectionReason,
    engineVersion: focus.engineVersion,
    generatedAt: focus.createdAt.toISOString(),
  };
}

function isTodaysFocusDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000 &&
    "keyPattern" in error &&
    Boolean((error as { keyPattern?: { userId?: unknown; utcDate?: unknown } }).keyPattern?.userId) &&
    Boolean((error as { keyPattern?: { userId?: unknown; utcDate?: unknown } }).keyPattern?.utcDate)
  );
}

async function findCachedFocus(userId: string, utcDate: Date): Promise<TodaysFocusDocument | null> {
  return TodaysFocusModel.findOne({ userId, utcDate });
}

export async function getTodaysFocus(
  userId: string,
  utcNow = new Date(),
): Promise<TodaysFocusResponse> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.onboardingComplete) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before viewing today's focus",
      statusCode: 403,
    });
  }

  const utcDate = startOfUtcDay(utcNow);
  const cachedFocus = await findCachedFocus(userId, utcDate);
  if (cachedFocus) {
    return serializeTodaysFocus(cachedFocus);
  }

  const profile = await getUserProfileDocument(userId).catch((error) => {
    if (error instanceof NotFoundError) {
      return null;
    }

    throw error;
  });

  if (!profile) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before viewing today's focus",
      statusCode: 403,
    });
  }

  const weekStart = startOfUtcWeek(utcNow);
  const nextWeekStart = addUtcDays(weekStart, 7);
  const recentStart = addUtcMilliseconds(utcNow, -MS_PER_DAY);
  const doseStart = addUtcDays(utcNow, -14);

  const [
    recentMealLogs,
    weekMealLogs,
    recentWorkoutLogs,
    weekWorkoutLogs,
    totalMealLogs,
    totalWorkoutLogs,
    protocol,
    doseLogs,
    recentCheckin,
  ] = await Promise.all([
    MealLogModel.find({
      userId,
      deletedAt: null,
      recordedAt: { $gte: recentStart, $lt: utcNow },
    }).select("protein recordedAt"),
    MealLogModel.find({
      userId,
      deletedAt: null,
      recordedAt: { $gte: weekStart, $lt: nextWeekStart },
    }).select("protein recordedAt"),
    WorkoutLogModel.find({
      userId,
      deletedAt: null,
      recordedAt: { $gte: recentStart, $lt: utcNow },
    }).select("recordedAt"),
    WorkoutLogModel.find({
      userId,
      deletedAt: null,
      recordedAt: { $gte: weekStart, $lt: nextWeekStart },
    }).select("recordedAt"),
    MealLogModel.countDocuments({ userId, deletedAt: null }),
    WorkoutLogModel.countDocuments({ userId, deletedAt: null }),
    UserMedicationProtocolModel.findOne({ userId, active: true }),
    DoseLogModel.find({
      userId,
      deletedAt: null,
      recordedAt: { $gte: doseStart, $lte: utcNow },
    }).sort({ recordedAt: -1 }),
    WeeklyCheckinModel.findOne({ userId }).sort({ weekOf: -1 }),
  ]);

  const shotDayContext = computeShotDayContext(
    protocol ? toProtocol(protocol) : null,
    doseLogs.map(toDoseLog),
    utcNow,
  );
  const energy = deriveEnergyFromCheckin(recentCheckin, profile);
  const selectedFocus = await selectFocusCategory({
    userId,
    userProfile: {
      dailyProteinTarget: profile.dailyProteinTarget,
      weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
    },
    shotDayContext,
    energy,
    recentMealLogs,
    weekMealLogs,
    recentWorkoutLogs,
    weekWorkoutLogs,
    recentCheckin,
    totalMealLogs,
    totalWorkoutLogs,
    utcNow,
  });

  let coachContent: TodaysFocusCoachContent | null = null;

  try {
    const generatedCopy = await generateTodaysFocusCopy({
      category: selectedFocus.category,
      selectionReason: selectedFocus.selectionReason,
      inputsSnapshot: selectedFocus.inputsSnapshot,
      biggestFear: profile.biggestFear,
      calorieTarget: profile.dailyCalorieTarget,
    });
    coachContent = {
      headline: generatedCopy.headline,
      suggestion: generatedCopy.suggestion,
      actionType: generatedCopy.actionType,
      actionLabel: generatedCopy.actionLabel,
      copyVersion: generatedCopy.copyVersion,
    };
  } catch (error) {
    logger.warn({ error, userId, category: selectedFocus.category }, "[home] today's focus copy unavailable");
  }

  try {
    const createdFocus = await TodaysFocusModel.create({
      userId,
      utcDate,
      category: selectedFocus.category,
      selectionReason: selectedFocus.selectionReason,
      coachContent,
      inputsSnapshot: selectedFocus.inputsSnapshot,
      engineVersion: TODAYS_FOCUS_ENGINE_VERSION,
    });

    return serializeTodaysFocus(createdFocus);
  } catch (error) {
    if (isTodaysFocusDuplicateKeyError(error)) {
      const focus = await findCachedFocus(userId, utcDate);
      if (focus) {
        return serializeTodaysFocus(focus);
      }
    }

    throw error;
  }
}
