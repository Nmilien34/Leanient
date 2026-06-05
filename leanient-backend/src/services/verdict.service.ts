import type {
  UserContextSnapshot,
  VerdictInputDataSource,
  VerdictSource,
  VerdictStatus,
  WeightMeasurement,
  WeightUnit,
} from "@leanient/shared";
import { logger } from "../lib/logger";
import { convertWeightForDisplay } from "../lib/units";
import { MealLogModel } from "../models/mealLog.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import { buildVerdictCopy, generateVerdictExplanation } from "./coachContent.service";

export const VERDICT_ENGINE_VERSION = "leanient-verdict-2026-05-29";

export interface CalculateWeeklyVerdictInput {
  userId: string;
  checkinId: string;
  weekOf: string;
  weight: WeightMeasurement;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  dataSource?: {
    protein: VerdictInputDataSource;
    training: VerdictInputDataSource;
  };
  userContextSnapshot: UserContextSnapshot;
  source?: VerdictSource;
}

export interface WeeklyVerdictDraft {
  userId: string;
  weekOf: string;
  checkinId: string | null;
  source: VerdictSource;
  engineVersion: string;
  copyVersion: string | null;
  explanation: string | null;
  status: VerdictStatus;
  score: number | null;
  estimatedLeanMassRisk: number | null;
  nextActionCode: string;
  headline: string;
  message: string;
  explanationFactors: string[];
  inputsUsed?: UserContextSnapshot & {
    weight?: WeightMeasurement;
    proteinGramsPerDay?: number;
    resistanceWorkoutsCompleted?: number;
    dataSource?: {
      protein: VerdictInputDataSource;
      training: VerdictInputDataSource;
    };
  };
}

interface NoDataInput {
  userId: string;
  weekOf: string;
  timezone: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateWeightLossPercent(
  priorWeight: WeightMeasurement | undefined,
  currentWeight: WeightMeasurement,
): number {
  if (!priorWeight || priorWeight.unit !== currentWeight.unit || priorWeight.value <= 0) {
    return 0;
  }

  return Math.max(0, ((priorWeight.value - currentWeight.value) / priorWeight.value) * 100);
}

function statusFromScore(score: number): VerdictStatus {
  if (score >= 80) {
    return "on_track";
  }

  if (score >= 55) {
    return "drifting";
  }

  return "losing_muscle";
}

function nextActionFor(input: {
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  weightLossPercent: number;
}): string {
  if (input.resistanceWorkoutsCompleted < 2) {
    return "add_resistance_training";
  }

  if (input.proteinGramsPerDay < 90) {
    return "increase_protein";
  }

  if (input.weightLossPercent > 2) {
    return "slow_pace";
  }

  return "keep_rhythm";
}

function weekRange(weekOf: string): { start: Date; end: Date } {
  const start = new Date(`${weekOf}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function proteinAverageByLoggedMealDay(logs: Array<{ protein: number; recordedAt: Date }>): number {
  const loggedDays = new Set(logs.map((log) => dateKey(log.recordedAt)));
  const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);

  return Math.round(totalProtein / loggedDays.size);
}

export async function resolveWeeklyVerdictInputs(input: {
  userId: string;
  weekOf: string;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
}): Promise<{
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  dataSource: {
    protein: VerdictInputDataSource;
    training: VerdictInputDataSource;
  };
}> {
  const { start, end } = weekRange(input.weekOf);
  const rangeFilter = {
    userId: input.userId,
    deletedAt: null,
    recordedAt: {
      $gte: start,
      $lt: end,
    },
  };

  const [mealLogs, workoutLogCount, resistanceWorkoutCount] = await Promise.all([
    MealLogModel.find(rangeFilter).select("protein recordedAt"),
    WorkoutLogModel.countDocuments(rangeFilter),
    WorkoutLogModel.countDocuments({
      ...rangeFilter,
      countsAsResistance: true,
    }),
  ]);

  return {
    proteinGramsPerDay:
      mealLogs.length > 0
        ? proteinAverageByLoggedMealDay(mealLogs)
        : input.proteinGramsPerDay,
    resistanceWorkoutsCompleted:
      workoutLogCount > 0 ? resistanceWorkoutCount : input.resistanceWorkoutsCompleted,
    dataSource: {
      protein: mealLogs.length > 0 ? "logs" : "checkin_fallback",
      training: workoutLogCount > 0 ? "logs" : "checkin_fallback",
    },
  };
}

export function calculateWeeklyVerdict(input: CalculateWeeklyVerdictInput): WeeklyVerdictDraft {
  const weightLossPercent = calculateWeightLossPercent(
    input.userContextSnapshot.priorWeight,
    input.weight,
  );

  const explanationFactors: string[] = [];
  let score = 100;

  if (weightLossPercent > 2) {
    score -= 25;
    explanationFactors.push("Weight loss was faster than the conservative weekly target.");
  } else if (weightLossPercent > 1) {
    score -= 15;
    explanationFactors.push("Weight loss pace was a little fast for muscle retention.");
  } else {
    explanationFactors.push("Weight loss pace stayed in a conservative range.");
  }

  if (input.userContextSnapshot.profile.goalPace === "aggressive") {
    score -= 10;
    explanationFactors.push(
      "Your selected pace is aggressive, so Leanient scores protection tighter.",
    );
  }

  if (input.proteinGramsPerDay < 90) {
    score -= 20;
    explanationFactors.push("Protein intake was below the current protection target.");
  } else {
    explanationFactors.push("Protein intake supported lean-mass retention.");
  }

  if (input.resistanceWorkoutsCompleted === 0) {
    score -= 25;
    explanationFactors.push("No resistance sessions were logged this week.");
  } else if (input.resistanceWorkoutsCompleted === 1) {
    score -= 12;
    explanationFactors.push("One resistance session helped, but the week needed more stimulus.");
  } else if (input.resistanceWorkoutsCompleted === 2) {
    score -= 4;
    explanationFactors.push("Two resistance sessions gave the week a useful muscle signal.");
  } else {
    explanationFactors.push("Resistance training gave the week a strong muscle signal.");
  }

  const normalizedScore = Math.round(clamp(score, 0, 100));
  const status = statusFromScore(normalizedScore);
  const nextActionCode = nextActionFor({
    proteinGramsPerDay: input.proteinGramsPerDay,
    resistanceWorkoutsCompleted: input.resistanceWorkoutsCompleted,
    weightLossPercent,
  });
  const estimatedLeanMassRisk = Number(clamp((100 - normalizedScore) / 100, 0, 1).toFixed(2));
  const copy = buildVerdictCopy({ status, nextActionCode, explanationFactors });

  return {
    userId: input.userId,
    weekOf: input.weekOf,
    checkinId: input.checkinId,
    source: input.source ?? "checkin",
    engineVersion: VERDICT_ENGINE_VERSION,
    copyVersion: null,
    explanation: null,
    status,
    score: normalizedScore,
    estimatedLeanMassRisk,
    nextActionCode,
    headline: copy.headline,
    message: copy.message,
    explanationFactors,
    inputsUsed: {
      ...input.userContextSnapshot,
      weight: input.weight,
      proteinGramsPerDay: input.proteinGramsPerDay,
      resistanceWorkoutsCompleted: input.resistanceWorkoutsCompleted,
      dataSource: input.dataSource ?? {
        protein: "checkin_fallback",
        training: "checkin_fallback",
      },
    },
  };
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

function displayUnitSystem(unit: WeightUnit | undefined): "imperial" | "metric" {
  return unit === "kg" ? "metric" : "imperial";
}

function toWeightLb(measurement: WeightMeasurement): number {
  return measurement.unit === "kg" ? measurement.value * 2.2046 : measurement.value;
}

function displayWeightMeasurement(
  measurement: WeightMeasurement | undefined,
  preferredUnit: WeightUnit,
): WeightMeasurement | undefined {
  if (!measurement) {
    return undefined;
  }

  const display = convertWeightForDisplay(toWeightLb(measurement), displayUnitSystem(preferredUnit));
  return {
    ...measurement,
    value: display.value,
    unit: display.unit,
  };
}

function normalizeCoachContextUnits(
  userContext: UserContextSnapshot,
): UserContextSnapshot {
  const preferredUnit = userContext.profile.goalWeightUnit ?? "lb";

  return {
    ...userContext,
    profile: {
      ...userContext.profile,
      goalWeightUnit: preferredUnit,
    },
    priorWeight: displayWeightMeasurement(userContext.priorWeight, preferredUnit),
  };
}

function normalizeCoachDraftUnits(
  draft: WeeklyVerdictDraft,
  preferredUnit: WeightUnit,
): WeeklyVerdictDraft {
  if (!draft.inputsUsed) {
    return draft;
  }

  return {
    ...draft,
    inputsUsed: {
      ...draft.inputsUsed,
      profile: {
        ...draft.inputsUsed.profile,
        goalWeightUnit: preferredUnit,
      },
      weight: displayWeightMeasurement(draft.inputsUsed.weight, preferredUnit),
      priorWeight: displayWeightMeasurement(draft.inputsUsed.priorWeight, preferredUnit),
    },
  };
}

export async function calculateWeeklyVerdictWithExplanation(
  input: CalculateWeeklyVerdictInput,
): Promise<WeeklyVerdictDraft> {
  const draft = calculateWeeklyVerdict(input);
  const coachContext = normalizeCoachContextUnits(input.userContextSnapshot);
  const coachDraft = normalizeCoachDraftUnits(draft, coachContext.profile.goalWeightUnit);

  try {
    const coachContent = await generateVerdictExplanation(coachDraft, coachContext);
    return {
      ...draft,
      explanation: coachContent.explanation,
      copyVersion: coachContent.copyVersion,
    };
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        weekOf: input.weekOf,
        status: draft.status,
        category: coachErrorCategory(error),
        error,
      },
      "[verdict] coach explanation generation failed",
    );
    return draft;
  }
}

export function createNoDataVerdict(input: NoDataInput): WeeklyVerdictDraft {
  const explanationFactors = [
    `No weekly check-in was submitted for ${input.weekOf}.`,
    `The user's timezone at evaluation was ${input.timezone}.`,
  ];
  const copy = buildVerdictCopy({
    status: "no_data",
    nextActionCode: "complete_checkin",
    explanationFactors,
  });

  return {
    userId: input.userId,
    weekOf: input.weekOf,
    checkinId: null,
    source: "cron_no_data",
    engineVersion: VERDICT_ENGINE_VERSION,
    copyVersion: null,
    explanation: null,
    status: "no_data",
    score: null,
    estimatedLeanMassRisk: null,
    nextActionCode: "complete_checkin",
    headline: copy.headline,
    message: copy.message,
    explanationFactors,
  };
}
