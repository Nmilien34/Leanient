import type {
  GoalPace,
  LeanientFocusArea,
  StallDeterministicAnalysis,
  StallDiagnosticResponse,
  Weekday,
  WeightUnit,
} from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";
import { convertWeightForDisplay } from "../lib/units";
import { toDateOnly } from "../lib/week";
import { DoseLogModel, type DoseLogDocument } from "../models/doseLog.model";
import { MealLogModel, type MealLogDocument } from "../models/mealLog.model";
import { UserModel } from "../models/user.model";
import {
  resolveShotDays,
  UserMedicationProtocolModel,
  type UserMedicationProtocolDocument,
} from "../models/userMedicationProtocol.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WeeklyCheckinModel, type WeeklyCheckinDocument } from "../models/weeklyCheckin.model";
import { WeightLogModel, type WeightLogDocument } from "../models/weightLog.model";
import { WorkoutLogModel, type WorkoutLogDocument } from "../models/workoutLog.model";
import { generateStallDiagnostic } from "./coachContent.service";

export const STALL_DETECTION_ENGINE_VERSION = "v1.0";

const STALL_LOOKBACK_DAYS = 30;
const STALL_FLAT_DAYS = 14;
const STALL_WEIGHT_DELTA_BY_UNIT: Record<WeightUnit, number> = {
  lb: 0.5,
  kg: 0.23,
};
const MIN_WEIGHT_LOGS_FOR_STALL = 3;
const MIN_MEAL_LOGS_FOR_PROTEIN_TREND = 5;
const RESISTANCE_SESSIONS_TARGET_PER_14_DAYS = 4;
const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;
const WEEKDAY_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function daysAgo(from: Date, days: number): Date {
  const copy = new Date(from);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function emptyAnalysis(unit: WeightUnit = "lb"): StallDeterministicAnalysis {
  return {
    weightTrend: {
      daysFlat: 0,
      startWeight: 0,
      endWeight: 0,
      unit,
    },
    proteinTrend: {
      recentAvgGrams: 0,
      priorAvgGrams: 0,
      deltaGrams: 0,
    },
    trainingTrend: {
      recentSessionsCount: 0,
      recentSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
      priorSessionsCount: 0,
      priorSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
    },
    doseTrend: null,
  };
}

function displayUnitSystem(unit: WeightUnit | undefined): "imperial" | "metric" {
  return unit === "kg" ? "metric" : "imperial";
}

function toWeightLb(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value * 2.2046 : value;
}

function convertAnalysisWeightTrendForCoach(
  analysis: StallDeterministicAnalysis,
  preferredUnit: WeightUnit | undefined,
): StallDeterministicAnalysis {
  const startWeight = convertWeightForDisplay(
    toWeightLb(analysis.weightTrend.startWeight, analysis.weightTrend.unit),
    displayUnitSystem(preferredUnit),
  );
  const endWeight = convertWeightForDisplay(
    toWeightLb(analysis.weightTrend.endWeight, analysis.weightTrend.unit),
    displayUnitSystem(preferredUnit),
  );

  return {
    ...analysis,
    weightTrend: {
      ...analysis.weightTrend,
      startWeight: startWeight.value,
      endWeight: endWeight.value,
      unit: startWeight.unit,
    },
  };
}

function baseResponse(analysis: StallDeterministicAnalysis): StallDiagnosticResponse {
  return {
    stalled: false,
    daysSinceWeightChange: 0,
    deterministicAnalysis: analysis,
    explanation: null,
    suggestedFix: null,
    copyVersion: null,
    engineVersion: STALL_DETECTION_ENGINE_VERSION,
  };
}

function splitCheckinsByWindow(checkins: WeeklyCheckinDocument[], recentStart: Date) {
  const recentStartDate = toDateOnly(recentStart);
  const recent = checkins.filter((checkin) => checkin.weekOf >= recentStartDate);
  const prior = checkins.filter((checkin) => checkin.weekOf < recentStartDate);

  return { prior, recent };
}

function computeProteinTrend(prior: WeeklyCheckinDocument[], recent: WeeklyCheckinDocument[]) {
  const recentAvgGrams = average(recent.map((checkin) => checkin.proteinGramsPerDay));
  const priorAvgGrams = average(prior.map((checkin) => checkin.proteinGramsPerDay));

  return {
    recentAvgGrams,
    priorAvgGrams,
    deltaGrams: recentAvgGrams - priorAvgGrams,
  };
}

function sumProteinByLoggedDay(logs: MealLogDocument[]): number[] {
  const totalsByDay = new Map<string, number>();

  for (const log of logs) {
    const day = log.recordedAt.toISOString().slice(0, 10);
    totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + log.protein);
  }

  return Array.from(totalsByDay.values());
}

function computeProteinTrendFromMealLogs(
  mealLogs: MealLogDocument[],
  recentStart: Date,
  fallbackPrior: WeeklyCheckinDocument[],
  fallbackRecent: WeeklyCheckinDocument[],
) {
  if (mealLogs.length < MIN_MEAL_LOGS_FOR_PROTEIN_TREND) {
    return computeProteinTrend(fallbackPrior, fallbackRecent);
  }

  const priorLogs = mealLogs.filter((log) => log.recordedAt < recentStart);
  const recentLogs = mealLogs.filter((log) => log.recordedAt >= recentStart);
  const recentAvgGrams = average(sumProteinByLoggedDay(recentLogs));
  const priorAvgGrams = average(sumProteinByLoggedDay(priorLogs));

  return {
    recentAvgGrams,
    priorAvgGrams,
    deltaGrams: recentAvgGrams - priorAvgGrams,
  };
}

function computeTrainingTrend(prior: WeeklyCheckinDocument[], recent: WeeklyCheckinDocument[]) {
  return {
    recentSessionsCount: recent.reduce(
      (sum, checkin) => sum + checkin.resistanceWorkoutsCompleted,
      0,
    ),
    recentSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
    priorSessionsCount: prior.reduce((sum, checkin) => sum + checkin.resistanceWorkoutsCompleted, 0),
    priorSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
  };
}

function computeTrainingTrendFromWorkoutLogs(
  workoutLogs: WorkoutLogDocument[],
  recentStart: Date,
  fallbackPrior: WeeklyCheckinDocument[],
  fallbackRecent: WeeklyCheckinDocument[],
) {
  if (workoutLogs.length === 0) {
    return computeTrainingTrend(fallbackPrior, fallbackRecent);
  }

  const resistanceLogs = workoutLogs.filter((log) => log.countsAsResistance === true);

  return {
    recentSessionsCount: resistanceLogs.filter((log) => log.recordedAt >= recentStart).length,
    recentSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
    priorSessionsCount: resistanceLogs.filter((log) => log.recordedAt < recentStart).length,
    priorSessionsTarget: RESISTANCE_SESSIONS_TARGET_PER_14_DAYS,
  };
}

function countExpectedWeeklyDoses(input: {
  protocol: UserMedicationProtocolDocument;
  from: Date;
  to: Date;
}): number {
  const protocolStart = new Date(`${input.protocol.startDate}T00:00:00.000Z`);
  const base = startOfUtcDay(protocolStart > input.from ? protocolStart : input.from);
  const end = startOfUtcDay(input.to);
  // Split-dose protocols inject on several weekdays, so expected weekly doses is
  // the sum of occurrences of each shot day in the window.
  const targetDays = resolveShotDays(input.protocol).map((day) => WEEKDAY_INDEX[day]);
  let expected = 0;

  for (const targetDay of targetDays) {
    const cursor = new Date(base);
    while (cursor.getUTCDay() !== targetDay) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    while (cursor.getTime() <= end.getTime()) {
      expected += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  }

  return expected;
}

function computeDoseTrend(
  doseLogs: DoseLogDocument[],
  protocol: UserMedicationProtocolDocument | null,
  recentStart: Date,
  now: Date,
): StallDeterministicAnalysis["doseTrend"] {
  if (doseLogs.length === 0) {
    return null;
  }

  const recentDoses = doseLogs.filter((log) => log.recordedAt >= recentStart).length;
  const expectedDoses = protocol
    ? countExpectedWeeklyDoses({
        protocol,
        from: recentStart,
        to: now,
      })
    : recentDoses;

  return {
    recentDoses,
    missedDoses: Math.max(expectedDoses - recentDoses, 0),
  };
}

function computeWeightTrend(weightLogs: WeightLogDocument[]): {
  hasEnoughWeightData: boolean;
  stalledByWeight: boolean;
  trend: StallDeterministicAnalysis["weightTrend"];
} {
  if (weightLogs.length === 0) {
    return {
      hasEnoughWeightData: false,
      stalledByWeight: false,
      trend: emptyAnalysis().weightTrend,
    };
  }

  const latest = weightLogs[weightLogs.length - 1];
  const sameUnitLogs = weightLogs.filter((log) => log.unit === latest.unit);
  const cutoff = daysAgo(latest.measuredAt, STALL_FLAT_DAYS);
  const comparison = [...sameUnitLogs]
    .reverse()
    .find((log) => log.measuredAt.getTime() <= cutoff.getTime());

  if (!comparison) {
    return {
      hasEnoughWeightData: weightLogs.length >= MIN_WEIGHT_LOGS_FOR_STALL,
      stalledByWeight: false,
      trend: {
        daysFlat: 0,
        startWeight: sameUnitLogs[0]?.value ?? latest.value,
        endWeight: latest.value,
        unit: latest.unit,
      },
    };
  }

  const delta = Math.abs(latest.value - comparison.value);
  const threshold = STALL_WEIGHT_DELTA_BY_UNIT[latest.unit];
  const flatDays = delta <= threshold ? daysBetween(comparison.measuredAt, latest.measuredAt) : 0;

  return {
    hasEnoughWeightData: weightLogs.length >= MIN_WEIGHT_LOGS_FOR_STALL,
    stalledByWeight: flatDays >= STALL_FLAT_DAYS,
    trend: {
      daysFlat: flatDays,
      startWeight: comparison.value,
      endWeight: latest.value,
      unit: latest.unit,
    },
  };
}

function latestMedicationName(checkins: WeeklyCheckinDocument[]): string | undefined {
  return [...checkins]
    .reverse()
    .find((checkin) => checkin.userContextSnapshot?.medicationProtocol?.medicationName)
    ?.userContextSnapshot?.medicationProtocol?.medicationName;
}

function coachErrorCategory(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "category" in error &&
    typeof (error as { category?: unknown }).category === "string"
  ) {
    return (error as { category: string }).category;
  }

  return undefined;
}

export async function getStallDiagnostic(
  userId: string,
  now = new Date(),
): Promise<StallDiagnosticResponse> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(user.subscriptionStatus as "trialing" | "active")) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Active subscription required for diagnostics",
      statusCode: 403,
    });
  }

  if (!user.onboardingComplete) {
    return baseResponse(emptyAnalysis());
  }

  const windowStart = daysAgo(now, STALL_LOOKBACK_DAYS);
  const recentStart = daysAgo(now, STALL_FLAT_DAYS);
  const [profile, weightLogs, checkins, mealLogs, workoutLogs, doseLogs, medicationProtocol] =
    await Promise.all([
      UserProfileModel.findOne({ userId }),
      WeightLogModel.find({
        userId,
        measuredAt: {
          $gte: windowStart,
          $lte: now,
        },
      }).sort({ measuredAt: 1 }),
      WeeklyCheckinModel.find({
        userId,
        weekOf: {
          $gte: toDateOnly(windowStart),
          $lte: toDateOnly(now),
        },
      }).sort({ weekOf: 1 }),
      MealLogModel.find({
        userId,
        deletedAt: null,
        recordedAt: {
          $gte: windowStart,
          $lte: now,
        },
      }).sort({ recordedAt: 1 }),
      WorkoutLogModel.find({
        userId,
        deletedAt: null,
        recordedAt: {
          $gte: windowStart,
          $lte: now,
        },
      }).sort({ recordedAt: 1 }),
      DoseLogModel.find({
        userId,
        deletedAt: null,
        recordedAt: {
          $gte: windowStart,
          $lte: now,
        },
      }).sort({ recordedAt: 1 }),
      UserMedicationProtocolModel.findOne({ userId, active: true }),
    ]);

  const { prior, recent } = splitCheckinsByWindow(checkins, recentStart);
  const weight = computeWeightTrend(weightLogs);
  const analysis: StallDeterministicAnalysis = {
    weightTrend: weight.trend,
    proteinTrend: computeProteinTrendFromMealLogs(mealLogs, recentStart, prior, recent),
    trainingTrend: computeTrainingTrendFromWorkoutLogs(workoutLogs, recentStart, prior, recent),
    doseTrend: computeDoseTrend(doseLogs, medicationProtocol, recentStart, now),
  };

  if (!weight.hasEnoughWeightData || !weight.stalledByWeight) {
    return baseResponse(analysis);
  }

  const stalledResponse: StallDiagnosticResponse = {
    ...baseResponse(analysis),
    stalled: true,
    daysSinceWeightChange: analysis.weightTrend.daysFlat,
  };

  try {
    const coachAnalysis = convertAnalysisWeightTrendForCoach(analysis, profile?.goalWeightUnit);
    const coachContent = await generateStallDiagnostic(coachAnalysis, {
      biggestFear:
        (profile?.biggestFear as LeanientFocusArea | undefined) ??
        checkins[checkins.length - 1]?.userContextSnapshot?.profile.biggestFear ??
        "losing_muscle",
      medicationName: medicationProtocol?.medicationName ?? latestMedicationName(checkins),
      goalPace:
        (profile?.goalPace as GoalPace | undefined) ??
        checkins[checkins.length - 1]?.userContextSnapshot?.profile.goalPace ??
        "steady",
    });

    return {
      ...stalledResponse,
      explanation: coachContent.explanation,
      suggestedFix: coachContent.suggestedFix,
      copyVersion: coachContent.copyVersion,
    };
  } catch (error) {
    logger.warn(
      {
        userId,
        category: coachErrorCategory(error),
        error,
      },
      "[diagnostics] stall coach content generation failed",
    );
    return stalledResponse;
  }
}
