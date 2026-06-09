import type { CoachChatMessage, CoachChatResponse } from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";
import { MealLogModel } from "../models/mealLog.model";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WeightLogModel } from "../models/weightLog.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import { WorkoutModel } from "../models/workout.model";
import {
  type CoachChatContext,
  generateCoachChatReply,
} from "./coachContent.service";
import { getStallDiagnostic } from "./stallDiagnostic.service";
import { getLatestWeeklyVerdict } from "./weeklyCheckin.service";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;
// Recent items pulled into the coach's context. Kept small so the prompt stays
// focused and token-cheap while still feeling personal.
const RECENT_MEAL_DISPLAY_LIMIT = 6;
const RECENT_MEAL_FETCH_LIMIT = 20;
const RECENT_WORKOUT_LIMIT = 5;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** A short, human relative label like "today", "yesterday", "3 days ago", or a date. */
function dayLabel(date: Date, now: Date): string {
  const diffDays = Math.floor(
    (startOfUtcDay(now).getTime() - startOfUtcDay(date).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toISOString().slice(0, 10);
}

function weeksOnMedication(startDate: string | undefined, now: Date): number | undefined {
  if (!startDate) return undefined;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return undefined;
  const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.floor(days / 7));
}

/**
 * Builds a grounded context snapshot for the user, then asks the coach model to
 * answer the running conversation. The conversation is constrained on the way in
 * (length, message count) by the request schema; this layer adds the user's data
 * and the hard medical-advice boundaries via the system prompt.
 *
 * The snapshot pulls from many sources the user has logged (weekly verdict,
 * weight, meals, workouts, doses) so the coach can answer like it actually knows
 * them, not as a generic chatbot.
 */
export async function getCoachChatReply(
  userId: string,
  messages: CoachChatMessage[],
): Promise<CoachChatResponse> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(user.subscriptionStatus as "trialing" | "active")) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Active subscription required for the coach",
      statusCode: 403,
    });
  }

  const now = new Date();
  const todayStart = startOfUtcDay(now);

  const [diagnostic, profile, medication, latestVerdict, recentMealDocs, recentWorkoutDocs, latestWeight, earliestWeight] =
    await Promise.all([
      getStallDiagnostic(userId, now),
      UserProfileModel.findOne({ userId }),
      UserMedicationProtocolModel.findOne({ userId, active: true }),
      getLatestWeeklyVerdict(userId).catch(() => null),
      MealLogModel.find({ userId, deletedAt: null })
        .sort({ recordedAt: -1 })
        .limit(RECENT_MEAL_FETCH_LIMIT),
      WorkoutLogModel.find({ userId, deletedAt: null })
        .sort({ recordedAt: -1 })
        .limit(RECENT_WORKOUT_LIMIT),
      WeightLogModel.findOne({ userId }).sort({ measuredAt: -1 }),
      WeightLogModel.findOne({ userId }).sort({ measuredAt: 1 }),
    ]);

  const analysis = diagnostic.deterministicAnalysis;

  // Resolve catalog titles for any logged workouts that reference a catalog workout.
  const workoutIds = recentWorkoutDocs
    .map((w) => w.workoutId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
  const workoutTitleById = new Map<string, string>();
  if (workoutIds.length > 0) {
    const catalog = await WorkoutModel.find({ _id: { $in: workoutIds } }, "title");
    for (const entry of catalog) {
      workoutTitleById.set(String(entry._id), entry.title);
    }
  }

  const recentMeals = recentMealDocs.slice(0, RECENT_MEAL_DISPLAY_LIMIT).map((meal) => ({
    foodName: meal.foodName,
    protein: Math.round(meal.protein),
    when: dayLabel(meal.recordedAt, now),
  }));

  const proteinLoggedToday = Math.round(
    recentMealDocs
      .filter((meal) => meal.recordedAt >= todayStart)
      .reduce((sum, meal) => sum + meal.protein, 0),
  );

  const recentWorkouts = recentWorkoutDocs.map((w) => ({
    title:
      w.customWorkoutName ??
      (w.workoutId ? workoutTitleById.get(String(w.workoutId)) : undefined) ??
      "Workout",
    durationMinutes: w.durationMinutes,
    countsAsResistance: w.countsAsResistance,
    when: dayLabel(w.recordedAt, now),
  }));

  // Only report a start weight when it shares the current unit, so the model
  // never computes a change across mixed lb/kg values.
  const currentWeight = latestWeight?.value;
  const startingWeight =
    earliestWeight && latestWeight && earliestWeight.unit === latestWeight.unit
      ? earliestWeight.value
      : undefined;

  const verdict =
    latestVerdict && latestVerdict.status === "available"
      ? {
          status: latestVerdict.verdict.status,
          score: latestVerdict.verdict.score,
          estimatedLeanMassRisk: latestVerdict.verdict.estimatedLeanMassRisk,
          nextActionCode: latestVerdict.verdict.nextActionCode,
          weekOf: latestVerdict.verdict.weekOf,
          explanation: latestVerdict.verdict.explanation,
        }
      : undefined;

  const context: CoachChatContext = {
    biggestFear: profile?.biggestFear ?? "losing_muscle",
    goalPace: profile?.goalPace ?? "steady",
    trainingStatus: profile?.trainingStatus,
    medicationName: medication?.medicationName,
    goalWeight: profile?.goalWeight,
    goalWeightUnit: profile?.goalWeightUnit,
    stalled: diagnostic.stalled,
    daysWeightFlat: diagnostic.daysSinceWeightChange,
    weightUnit: latestWeight?.unit ?? analysis.weightTrend.unit,
    proteinRecentAvgGrams: analysis.proteinTrend.recentAvgGrams,
    proteinPriorAvgGrams: analysis.proteinTrend.priorAvgGrams,
    recentSessionsCount: analysis.trainingTrend.recentSessionsCount,
    recentSessionsTarget: analysis.trainingTrend.recentSessionsTarget,
    stallExplanation: diagnostic.explanation ?? undefined,
    stallSuggestedFix: diagnostic.suggestedFix ?? undefined,
    // Richer, personal grounding.
    firstName: user.displayName?.trim().split(/\s+/)[0] || undefined,
    weeksOnMedication: weeksOnMedication(medication?.startDate, now),
    currentWeight,
    startingWeight,
    verdict,
    proteinLoggedToday: profile?.dailyProteinTarget !== undefined ? proteinLoggedToday : undefined,
    proteinTargetToday: profile?.dailyProteinTarget,
    recentMeals: recentMeals.length > 0 ? recentMeals : undefined,
    recentWorkouts: recentWorkouts.length > 0 ? recentWorkouts : undefined,
    recentDoses: analysis.doseTrend?.recentDoses,
    missedDoses: analysis.doseTrend?.missedDoses,
  };

  try {
    const result = await generateCoachChatReply(messages, context);
    return { reply: result.reply, refused: result.refused };
  } catch (error) {
    logger.warn({ userId, error }, "[coach] chat reply generation failed");
    throw new AppError({
      code: ERROR_CODES.internal,
      message: "The coach is unavailable right now. Try again in a moment.",
      statusCode: 503,
    });
  }
}
