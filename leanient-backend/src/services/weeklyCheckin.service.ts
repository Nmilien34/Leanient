import {
  ERROR_CODES,
  type LatestWeeklyVerdictResponse,
  type UserContextSnapshot,
  type WeeklyCheckinRequest,
} from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";
import { normalizeProfileTrainingFields } from "../lib/training";
import { UserModel } from "../models/user.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import { WeeklyVerdictModel } from "../models/weeklyVerdict.model";
import { WeightLogModel } from "../models/weightLog.model";
import { serializeWeeklyCheckin, serializeWeeklyVerdict } from "./serializers";
import { buildUserContextSnapshot } from "./userProfile.service";
import {
  calculateWeeklyVerdictWithExplanation,
  resolveWeeklyVerdictInputs,
} from "./verdict.service";
import { createOrUpdateSnapshotForWeek } from "./muscleRetention.service";

export const STILL_GATHERING_VERDICT_MESSAGE =
  "Your first verdict is almost ready. Log this week's check-in to see whether you're keeping your muscle. Takes 90 seconds.";

export async function submitWeeklyCheckin(userId: string, body: WeeklyCheckinRequest) {
  const userContextSnapshot = body.userContextSnapshot
    ? normalizeUserContextSnapshot(body.userContextSnapshot)
    : await buildUserContextSnapshot(userId);

  const weightLog = await WeightLogModel.findOneAndUpdate(
    {
      userId,
      weekOf: body.weekOf,
    },
    {
      $set: {
        value: body.weight.value,
        unit: body.weight.unit,
        measuredAt: new Date(body.weight.measuredAt),
        source: "weekly_checkin",
        weekOf: body.weekOf,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  const checkin = await WeeklyCheckinModel.findOneAndUpdate(
    {
      userId,
      weekOf: body.weekOf,
    },
    {
      $set: {
        weight: body.weight,
        proteinGramsPerDay: body.proteinGramsPerDay,
        resistanceWorkoutsCompleted: body.resistanceWorkoutsCompleted,
        sideEffects: body.sideEffects,
        notes: body.notes,
        userContextSnapshot,
        weightLogId: weightLog._id,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  weightLog.weeklyCheckinId = checkin._id;
  await weightLog.save();

  const verdictInputs = await resolveWeeklyVerdictInputs({
    userId,
    weekOf: checkin.weekOf,
    proteinGramsPerDay: checkin.proteinGramsPerDay,
    resistanceWorkoutsCompleted: checkin.resistanceWorkoutsCompleted,
  });

  const verdictDraft = await calculateWeeklyVerdictWithExplanation({
    userId,
    checkinId: checkin._id.toString(),
    weekOf: checkin.weekOf,
    weight: checkin.weight,
    proteinGramsPerDay: verdictInputs.proteinGramsPerDay,
    resistanceWorkoutsCompleted: verdictInputs.resistanceWorkoutsCompleted,
    dataSource: verdictInputs.dataSource,
    userContextSnapshot,
    source: "checkin",
  });

  const verdict = await WeeklyVerdictModel.findOneAndUpdate(
    {
      userId,
      weekOf: body.weekOf,
    },
    {
      $set: {
        ...verdictDraft,
        checkinId: checkin._id,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await createOrUpdateSnapshotForWeek(userId, new Date(`${body.weekOf}T00:00:00.000Z`));
  } catch (error) {
    logger.warn({ error, userId, weekOf: body.weekOf }, "[weekly-checkin] muscle retention snapshot unavailable");
  }

  return {
    checkin: serializeWeeklyCheckin(checkin),
    verdict: serializeWeeklyVerdict(verdict),
  };
}

function normalizeUserContextSnapshot(
  snapshot: WeeklyCheckinRequest["userContextSnapshot"],
): UserContextSnapshot {
  if (!snapshot) {
    throw new NotFoundError("User context snapshot not found");
  }

  const trainingFields = normalizeProfileTrainingFields({
    trainingStatus: snapshot.profile.trainingStatus,
    equipmentAccess: snapshot.profile.equipmentAccess,
    weeklyWorkoutTarget: snapshot.profile.weeklyWorkoutTarget,
  });

  return {
    ...snapshot,
    profile: {
      ...snapshot.profile,
      ...trainingFields,
    },
  };
}

export async function getLatestWeeklyVerdict(userId: string): Promise<LatestWeeklyVerdictResponse> {
  const verdict = await WeeklyVerdictModel.findOne({ userId }).sort({ weekOf: -1 });

  if (verdict) {
    return {
      status: "available",
      verdict: serializeWeeklyVerdict(verdict),
      message: null,
    };
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.onboardingComplete) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before viewing your weekly verdict",
      statusCode: 403,
    });
  }

  return {
    status: "still_gathering",
    verdict: null,
    message: STILL_GATHERING_VERDICT_MESSAGE,
  };
}
