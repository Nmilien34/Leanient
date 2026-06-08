import type { CoachChatMessage, CoachChatResponse } from "@leanient/shared";
import { ERROR_CODES } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { UserProfileModel } from "../models/userProfile.model";
import {
  type CoachChatContext,
  generateCoachChatReply,
} from "./coachContent.service";
import { getStallDiagnostic } from "./stallDiagnostic.service";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;

/**
 * Builds a grounded context snapshot for the user, then asks the coach model to
 * answer the running conversation. The conversation is constrained on the way in
 * (length, message count) by the request schema; this layer adds the user's data
 * and the hard medical-advice boundaries via the system prompt.
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

  const [diagnostic, profile, medication] = await Promise.all([
    getStallDiagnostic(userId),
    UserProfileModel.findOne({ userId }),
    UserMedicationProtocolModel.findOne({ userId, active: true }),
  ]);

  const analysis = diagnostic.deterministicAnalysis;
  const context: CoachChatContext = {
    biggestFear: profile?.biggestFear ?? "losing_muscle",
    goalPace: profile?.goalPace ?? "steady",
    trainingStatus: profile?.trainingStatus,
    medicationName: medication?.medicationName,
    goalWeight: profile?.goalWeight,
    goalWeightUnit: profile?.goalWeightUnit,
    stalled: diagnostic.stalled,
    daysWeightFlat: diagnostic.daysSinceWeightChange,
    weightUnit: analysis.weightTrend.unit,
    proteinRecentAvgGrams: analysis.proteinTrend.recentAvgGrams,
    proteinPriorAvgGrams: analysis.proteinTrend.priorAvgGrams,
    recentSessionsCount: analysis.trainingTrend.recentSessionsCount,
    recentSessionsTarget: analysis.trainingTrend.recentSessionsTarget,
    stallExplanation: diagnostic.explanation ?? undefined,
    stallSuggestedFix: diagnostic.suggestedFix ?? undefined,
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
