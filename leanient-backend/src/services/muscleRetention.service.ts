import { ERROR_CODES, type ProgressOverviewResponse, type VerdictInputDataSource } from "@leanient/shared";
import { AppError, NotFoundError } from "../lib/errors";
import {
  composeWeightLoss,
  computeMuscleRetentionScore,
  MUSCLE_RETENTION_ENGINE_VERSION,
  type MuscleRetentionLabel,
} from "../lib/muscleRetention";
import { startOfUtcWeek, toDateOnly } from "../lib/week";
import { MuscleRetentionSnapshotModel } from "../models/muscleRetentionSnapshot.model";
import type { MuscleRetentionSnapshotDocument } from "../models/muscleRetentionSnapshot.model";
import { UserModel } from "../models/user.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { WeightLogModel, type WeightLogDocument } from "../models/weightLog.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import type { WeeklyCheckinDocument } from "../models/weeklyCheckin.model";
import { getUserProfileDocument } from "./userProfile.service";
import { resolveWeeklyVerdictInputs } from "./verdict.service";
import { serializeMuscleRetentionSnapshot } from "./serializers";

interface WeightPoint {
  valueLb: number;
  measuredAt: Date;
  source: VerdictInputDataSource;
}

export interface MuscleRetentionChartData {
  snapshots: MuscleRetentionSnapshotDocument[];
  weeksOnProtocol: number;
  startingWeight: number;
  currentWeight: number;
  totalWeightLoss: number;
  currentLabel: MuscleRetentionLabel;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeWeekOf(weekOf: Date): Date {
  return new Date(Date.UTC(weekOf.getUTCFullYear(), weekOf.getUTCMonth(), weekOf.getUTCDate()));
}

function toLb(value: number, unit: "lb" | "kg"): number {
  return unit === "kg" ? value * 2.2046226218 : value;
}

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}

function weightPointFromLog(log: WeightLogDocument): WeightPoint {
  return {
    valueLb: toLb(log.value, log.unit),
    measuredAt: log.measuredAt,
    source: "logs",
  };
}

function weightPointFromCheckin(checkin: WeeklyCheckinDocument): WeightPoint {
  return {
    valueLb: toLb(checkin.weight.value, checkin.weight.unit),
    measuredAt: new Date(checkin.weight.measuredAt),
    source: "checkin_fallback",
  };
}

export async function getStartingWeight(userId: string): Promise<WeightPoint | null> {
  const onboardingWeight = await WeightLogModel.findOne({
    userId,
    source: "onboarding",
  }).sort({ measuredAt: 1 });

  if (onboardingWeight) {
    return weightPointFromLog(onboardingWeight);
  }

  const earliestWeight = await WeightLogModel.findOne({ userId }).sort({ measuredAt: 1 });
  return earliestWeight ? weightPointFromLog(earliestWeight) : null;
}

async function getLatestWeight(userId: string, through?: Date): Promise<WeightPoint | null> {
  const filter = through ? { userId, measuredAt: { $lte: through } } : { userId };
  const latestWeight = await WeightLogModel.findOne(filter).sort({ measuredAt: -1 });
  return latestWeight ? weightPointFromLog(latestWeight) : null;
}

async function getCurrentWeightForWeek(input: {
  userId: string;
  weekOf: string;
  weekEnd: Date;
  checkin: WeeklyCheckinDocument | null;
}): Promise<WeightPoint | null> {
  const weeklyWeight = await WeightLogModel.findOne({
    userId: input.userId,
    weekOf: input.weekOf,
  }).sort({ measuredAt: -1 });

  if (weeklyWeight) {
    return weightPointFromLog(weeklyWeight);
  }

  if (input.checkin) {
    return weightPointFromCheckin(input.checkin);
  }

  return getLatestWeight(input.userId, input.weekEnd);
}

async function getPriorWeight(userId: string, before: Date): Promise<WeightPoint | null> {
  const priorWeight = await WeightLogModel.findOne({
    userId,
    measuredAt: { $lt: before },
  }).sort({ measuredAt: -1 });

  return priorWeight ? weightPointFromLog(priorWeight) : null;
}

async function getCheckins(userId: string): Promise<WeeklyCheckinDocument[]> {
  return WeeklyCheckinModel.find({ userId }).sort({ weekOf: 1 });
}

export async function createOrUpdateSnapshotForWeek(
  userId: string,
  weekOf: Date,
): Promise<MuscleRetentionSnapshotDocument> {
  const normalizedWeekOf = normalizeWeekOf(weekOf);
  const weekOfKey = toDateOnly(normalizedWeekOf);
  const weekEnd = addUtcDays(normalizedWeekOf, 7);
  const [profile, checkin, startingWeight] = await Promise.all([
    getUserProfileDocument(userId),
    WeeklyCheckinModel.findOne({ userId, weekOf: weekOfKey }),
    getStartingWeight(userId),
  ]);

  const resolvedInputs = await resolveWeeklyVerdictInputs({
    userId,
    weekOf: weekOfKey,
    proteinGramsPerDay: checkin?.proteinGramsPerDay ?? 0,
    resistanceWorkoutsCompleted: checkin?.resistanceWorkoutsCompleted ?? 0,
  });
  const currentWeight =
    (await getCurrentWeightForWeek({
      userId,
      weekOf: weekOfKey,
      weekEnd,
      checkin,
    })) ?? startingWeight;
  const priorWeight = currentWeight
    ? ((await getPriorWeight(userId, currentWeight.measuredAt)) ?? startingWeight ?? currentWeight)
    : startingWeight;
  const startWeightValue = priorWeight?.valueLb ?? currentWeight?.valueLb ?? 0;
  const endWeightValue = currentWeight?.valueLb ?? startWeightValue;
  const startingWeightValue = startingWeight?.valueLb ?? startWeightValue;
  const weeklyWeightLossLb = roundOne(startWeightValue - endWeightValue);
  const cumulativeWeightLossLb = roundOne(startingWeightValue - endWeightValue);

  // The ratios below match the verdict engine's interpretation of the resolved
  // weekly inputs. TODO: extract computeProteinAdherence and
  // computeTrainingAdherence from the verdict service so both consumers share the
  // ratio helpers directly.
  const proteinAdherence = resolvedInputs.proteinGramsPerDay / profile.dailyProteinTarget;
  const trainingAdherence =
    resolvedInputs.resistanceWorkoutsCompleted / profile.weeklyWorkoutTarget;
  const scores = computeMuscleRetentionScore({
    proteinAdherence,
    trainingAdherence,
    weeklyWeightLossLb,
  });

  return MuscleRetentionSnapshotModel.findOneAndUpdate(
    {
      userId,
      weekOf: normalizedWeekOf,
    },
    {
      $set: {
        userId,
        weekOf: normalizedWeekOf,
        ...scores,
        weeklyWeightLossLb,
        cumulativeWeightLossLb,
        inputsUsed: {
          avgDailyProteinGrams: resolvedInputs.proteinGramsPerDay,
          sessionsCompleted: resolvedInputs.resistanceWorkoutsCompleted,
          weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
          dailyProteinTarget: profile.dailyProteinTarget,
          startWeight: roundOne(startWeightValue),
          endWeight: roundOne(endWeightValue),
          dataSource: {
            protein: resolvedInputs.dataSource.protein,
            training: resolvedInputs.dataSource.training,
            weight: currentWeight?.source ?? "checkin_fallback",
          },
        },
        engineVersion: MUSCLE_RETENTION_ENGINE_VERSION,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function getRecentSnapshots(
  userId: string,
  weeks: number,
): Promise<MuscleRetentionSnapshotDocument[]> {
  const snapshots = await MuscleRetentionSnapshotModel.find({ userId }).sort({ weekOf: -1 }).limit(weeks);
  return snapshots.sort((left, right) => left.weekOf.getTime() - right.weekOf.getTime());
}

function weeksBetween(startDate: string, now: Date): number {
  const start = startOfUtcWeek(new Date(`${startDate}T00:00:00.000Z`));
  const current = startOfUtcWeek(now);
  const diffDays = Math.max(0, Math.floor((current.getTime() - start.getTime()) / 86_400_000));
  return Math.max(1, Math.ceil(diffDays / 7));
}

export async function backfillSnapshotsForUser(userId: string, now = new Date()): Promise<number> {
  const checkins = await getCheckins(userId);

  if (checkins.length > 0) {
    for (const checkin of checkins) {
      await createOrUpdateSnapshotForWeek(userId, new Date(`${checkin.weekOf}T00:00:00.000Z`));
    }

    return checkins.length;
  }

  const earliestNonOnboardingWeight = await WeightLogModel.findOne({
    userId,
    source: { $ne: "onboarding" },
  }).sort({ measuredAt: 1 });

  if (!earliestNonOnboardingWeight) {
    return 0;
  }

  let count = 0;
  let cursor = startOfUtcWeek(earliestNonOnboardingWeight.measuredAt);
  const currentWeek = startOfUtcWeek(now);

  while (cursor <= currentWeek) {
    await createOrUpdateSnapshotForWeek(userId, cursor);
    count += 1;
    cursor = addUtcDays(cursor, 7);
  }

  return count;
}

export async function getChartData(
  userId: string,
  weeks = 12,
  now = new Date(),
): Promise<MuscleRetentionChartData> {
  const boundedWeeks = Math.min(52, Math.max(1, weeks));
  const checkins = await getCheckins(userId);
  let snapshots = await getRecentSnapshots(userId, boundedWeeks);

  if (snapshots.length < Math.min(boundedWeeks, checkins.length)) {
    await backfillSnapshotsForUser(userId, now);
    snapshots = await getRecentSnapshots(userId, boundedWeeks);
  } else if (snapshots.length === 0 && checkins.length === 0) {
    const backfilledCount = await backfillSnapshotsForUser(userId, now);

    if (backfilledCount > 0) {
      snapshots = await getRecentSnapshots(userId, boundedWeeks);
    }
  }

  const [startingWeight, currentWeight, protocol] = await Promise.all([
    getStartingWeight(userId),
    getLatestWeight(userId),
    UserMedicationProtocolModel.findOne({ userId, active: true }),
  ]);
  const startingWeightValue = roundOne(startingWeight?.valueLb ?? currentWeight?.valueLb ?? 0);
  const currentWeightValue = roundOne(currentWeight?.valueLb ?? startingWeightValue);
  const latestSnapshot = snapshots[snapshots.length - 1];

  return {
    snapshots,
    weeksOnProtocol: protocol ? weeksBetween(protocol.startDate, now) : 0,
    startingWeight: startingWeightValue,
    currentWeight: currentWeightValue,
    totalWeightLoss: roundOne(startingWeightValue - currentWeightValue),
    currentLabel: latestSnapshot?.retentionLabel ?? "maintaining",
  };
}

export async function getProgressOverview(
  userId: string,
  weeks = 12,
  now = new Date(),
): Promise<ProgressOverviewResponse> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.onboardingComplete) {
    throw new AppError({
      code: ERROR_CODES.badRequest,
      message: "Complete onboarding before viewing progress",
      statusCode: 403,
    });
  }

  const [profile, protocol, chartData] = await Promise.all([
    getUserProfileDocument(userId),
    UserMedicationProtocolModel.findOne({ userId, active: true }),
    getChartData(userId, weeks, now),
  ]);
  const latestSnapshot = chartData.snapshots[chartData.snapshots.length - 1];

  // Estimate how much of the loss was fat vs lean mass, from the per-week
  // retention scores already on the snapshots. Pure read-time derivation, so it
  // works for existing users with no migration.
  const composition = composeWeightLoss({
    totalLostLb: chartData.totalWeightLoss,
    weeklyLosses: chartData.snapshots.map((snapshot) => ({
      weeklyWeightLossLb: snapshot.weeklyWeightLossLb,
      muscleRetentionScore: snapshot.muscleRetentionScore,
    })),
    fallbackScore: latestSnapshot?.muscleRetentionScore ?? 0,
  });

  return {
    chart: {
      snapshots: chartData.snapshots.map(serializeMuscleRetentionSnapshot),
      currentLabel: chartData.currentLabel,
      currentScore: latestSnapshot?.muscleRetentionScore ?? 0,
    },
    summary: {
      weeksOnProtocol: chartData.weeksOnProtocol,
      medicationName: protocol?.medicationName ?? null,
      startingWeight: chartData.startingWeight,
      currentWeight: chartData.currentWeight,
      totalWeightLoss: chartData.totalWeightLoss,
      targetWeight: profile.goalWeight,
      remainingToTarget: roundOne(chartData.currentWeight - profile.goalWeight),
      estimatedFatLostLb: composition.estimatedFatLostLb,
      estimatedMuscleLostLb: composition.estimatedMuscleLostLb,
      fatShareOfLossPct: composition.fatShareOfLossPct,
    },
    engineVersion: MUSCLE_RETENTION_ENGINE_VERSION,
  };
}
