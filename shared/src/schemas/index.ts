import { z } from "zod";
import {
  AUTH_PROVIDERS,
  DOSE_INJECTION_SITES,
  DOSE_LOG_UNITS,
  DOSE_UNITS,
  EQUIPMENT_ACCESS_OPTIONS,
  FOCUS_CATEGORIES,
  GOAL_PACES,
  JOURNEY_STAGES,
  LEANIENT_FOCUS_AREAS,
  MEAL_LOG_SOURCES,
  MEASUREMENT_UNITS,
  PROGRESS_PHOTO_KINDS,
  PROGRESS_PHOTO_STATUSES,
  SEX_VALUES,
  SIDE_EFFECT_SYMPTOMS,
  SUBSCRIPTION_STATUSES,
  TODAYS_FOCUS_ACTION_TYPES,
  TRAINING_STATUSES,
  VERDICT_INPUT_DATA_SOURCES,
  MUSCLE_RETENTION_LABELS,
  VERDICT_SOURCES,
  VERDICT_STATUSES,
  WEEKDAYS,
  WEIGHT_UNITS,
  WORKOUT_CATEGORIES,
  WORKOUT_DIFFICULTIES,
  WORKOUT_EQUIPMENT_OPTIONS,
  WORKOUT_ENERGY_PHASES,
  WORKOUT_EFFORTS,
  WORKOUT_INTENSITIES,
  WORKOUT_SELECTION_REASONS,
} from "../constants";

export const authProviderSchema = z.enum(AUTH_PROVIDERS);
export const verdictStatusSchema = z.enum(VERDICT_STATUSES);
export const verdictSourceSchema = z.enum(VERDICT_SOURCES);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const weightUnitSchema = z.enum(WEIGHT_UNITS);
export const goalPaceSchema = z.enum(GOAL_PACES);
export const sexSchema = z.enum(SEX_VALUES);
// Biological inputs for the Mifflin-St Jeor calorie model. Ranges are clamped to
// physiologically sane bounds (also a light guard against typos at onboarding).
export const ageYearsSchema = z.number().int().min(18).max(100);
export const heightInchesSchema = z.number().min(48).max(96);
export const journeyStageSchema = z.enum(JOURNEY_STAGES);
export const trainingStatusSchema = z.enum(TRAINING_STATUSES);
export const equipmentAccessSchema = z.enum(EQUIPMENT_ACCESS_OPTIONS);
export const leanientFocusAreaSchema = z.enum(LEANIENT_FOCUS_AREAS);
export const weekdaySchema = z.enum(WEEKDAYS);
export const doseUnitSchema = z.enum(DOSE_UNITS);
export const workoutDifficultySchema = z.enum(WORKOUT_DIFFICULTIES);
export const workoutEnergyPhaseSchema = z.enum(WORKOUT_ENERGY_PHASES);
export const workoutEquipmentSchema = z.enum(WORKOUT_EQUIPMENT_OPTIONS);
export const workoutIntensitySchema = z.enum(WORKOUT_INTENSITIES);
export const workoutCategorySchema = z.enum(WORKOUT_CATEGORIES);
export const workoutSelectionReasonSchema = z.enum(WORKOUT_SELECTION_REASONS);
export const progressPhotoStatusSchema = z.enum(PROGRESS_PHOTO_STATUSES);
export const progressPhotoKindSchema = z.enum(PROGRESS_PHOTO_KINDS);
export const faceFullnessSchema = z.number().int().min(1).max(5);
export const mealLogSourceSchema = z.enum(MEAL_LOG_SOURCES);
export const workoutEffortSchema = z.enum(WORKOUT_EFFORTS);
export const doseLogUnitSchema = z.enum(DOSE_LOG_UNITS);
export const doseInjectionSiteSchema = z.enum(DOSE_INJECTION_SITES);
export const measurementUnitSchema = z.enum(MEASUREMENT_UNITS);
export const sideEffectSymptomSchema = z.enum(SIDE_EFFECT_SYMPTOMS);
export const verdictInputDataSourceSchema = z.enum(VERDICT_INPUT_DATA_SOURCES);
export const muscleRetentionLabelSchema = z.enum(MUSCLE_RETENTION_LABELS);
export const focusCategorySchema = z.enum(FOCUS_CATEGORIES);
export const todaysFocusActionTypeSchema = z.enum(TODAYS_FOCUS_ACTION_TYPES);

export const linkedAuthProviderSchema = z.object({
  provider: authProviderSchema,
  providerUserId: z.string().min(1),
  linkedAt: z.string().datetime(),
});

export const userResponseSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  emailVerified: z.boolean(),
  onboardingComplete: z.boolean(),
  authProviders: z.array(linkedAuthProviderSchema),
  displayName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
  hasAvatar: z.boolean(),
  subscriptionStatus: subscriptionStatusSchema,
  entitlementExpiresAt: z.string().datetime().optional(),
  subscriptionWillRenew: z.boolean(),
  revenueCatCustomerId: z.string().min(1).optional(),
  revenueCatEntitlement: z.string().min(1).optional(),
  faceAnalysisConsentAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const faceAnalysisConsentRequestSchema = z
  .object({
    granted: z.boolean(),
  })
  .strict();

export const googleSignInRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const appleFullNameSchema = z
  .object({
    givenName: z.string().trim().min(1).optional(),
    familyName: z.string().trim().min(1).optional(),
  })
  .strict();

export const appleSignInRequestSchema = z.object({
  identityToken: z.string().min(1),
  fullName: appleFullNameSchema.optional(),
});

export const authResponseSchema = z.object({
  user: userResponseSchema,
  token: z.string().min(1),
});

export const patchMeRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().trim().url().optional(),
  })
  .strict();

// Avatar upload mirrors the progress-photo flow: request a presigned PUT URL,
// upload the bytes directly to S3, then confirm so the key is saved on the user.
export const avatarImageContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
]);

export const avatarUploadIntentRequestSchema = z
  .object({
    contentType: avatarImageContentTypeSchema,
    sizeBytes: z.number().int().positive().optional(),
  })
  .strict();

export const avatarUploadIntentResponseSchema = z
  .object({
    uploadUrl: z.string().url(),
    key: z.string().min(1),
    expiresAt: z.string().datetime(),
  })
  .strict();

export const avatarConfirmRequestSchema = z
  .object({
    key: z.string().min(1),
  })
  .strict();

export const avatarViewUrlResponseSchema = z
  .object({
    viewUrl: z.string().url().nullable(),
    expiresAt: z.string().datetime().nullable(),
  })
  .strict();

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

export const timezoneSchema = z.string().trim().min(1).default("America/New_York");

export const weightMeasurementSchema = z
  .object({
    value: z.number().positive(),
    unit: weightUnitSchema,
    measuredAt: z.string().datetime(),
  })
  .strict();

export const userProfileCoreSchema = z
  .object({
    journeyStage: journeyStageSchema,
    goalWeight: z.number().positive(),
    goalWeightUnit: weightUnitSchema,
    dailyProteinTarget: z.number().positive(),
    dailyCalorieTarget: z.number().positive(),
    goalPace: goalPaceSchema,
    biggestFear: leanientFocusAreaSchema,
    trainingStatus: trainingStatusSchema,
    equipmentAccess: equipmentAccessSchema.optional(),
    weeklyWorkoutTarget: z.number().int().positive().optional(),
    sideEffectBaseline: z.array(z.string().trim().min(1)).default([]),
    timezone: timezoneSchema,
  })
  .strict();

/**
 * Profile fields the client supplies (onboarding + PATCH). The daily protein and
 * calorie targets are intentionally absent: the backend computes them with the
 * Mifflin-St Jeor model and owns them as the single source of truth. Sex, age,
 * and height are required here because the model cannot run without them.
 */
export const userProfileInputSchema = userProfileCoreSchema
  .omit({ dailyProteinTarget: true, dailyCalorieTarget: true })
  .extend({
    sex: sexSchema,
    ageYears: ageYearsSchema,
    heightInches: heightInchesSchema,
  })
  .strict();

export const userProfileResponseSchema = userProfileCoreSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  equipmentAccess: equipmentAccessSchema,
  weeklyWorkoutTarget: z.number().int().positive(),
  // Optional on the response: legacy profiles predate these inputs. When any is
  // missing, `needsNutritionInputUpdate` is set so the app can prompt for them.
  sex: sexSchema.optional(),
  ageYears: ageYearsSchema.optional(),
  heightInches: heightInchesSchema.optional(),
  nutritionEngineVersion: z.string().min(1),
  needsNutritionInputUpdate: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// PATCH carries any subset of the editable inputs. Targets stay server-derived,
// so they are not patchable; the backend recomputes them when an input changes.
export const patchUserProfileRequestSchema = userProfileInputSchema.partial().strict();

export const medicationCatalogItemResponseSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    genericName: z.string().min(1),
    brandNames: z.array(z.string().min(1)),
    drugClass: z.enum(["glp_1", "dual_glp_1_gip", "other"]),
    doseUnits: z.array(doseUnitSchema).min(1),
    supportedDoseValues: z.array(z.number().positive()),
    active: z.boolean(),
    displayOrder: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const userMedicationProtocolCoreSchema = z
  .object({
    // Optional fields accept null and normalize it to undefined: Mongoose stores
    // unset optional fields as null in embedded snapshots, so a strict optional()
    // would reject reading them back (e.g. customMedicationName: null). The
    // transform keeps the output type `string | undefined` (no contract change).
    medicationCatalogId: z.string().min(1).nullish().transform((v) => v ?? undefined),
    medicationName: z.string().trim().min(1),
    customMedicationName: z.string().trim().min(1).nullish().transform((v) => v ?? undefined),
    doseAmount: z.number().positive().nullish().transform((v) => v ?? undefined),
    doseUnit: doseUnitSchema,
    // Days of the week the user injects. Usually one, but split-dose protocols
    // take shots on multiple days, so this is an array of at least one weekday.
    shotDays: z.array(weekdaySchema).min(1),
    startDate: dateOnlySchema,
    notes: z.string().trim().max(1000).nullish().transform((v) => v ?? undefined),
    active: z.boolean().default(true),
  })
  .strict();

export const userMedicationProtocolResponseSchema = userMedicationProtocolCoreSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const patchUserMedicationProtocolRequestSchema = userMedicationProtocolCoreSchema
  .partial()
  .strict();

export const userContextSnapshotSchema = z
  .object({
    profile: userProfileCoreSchema,
    medicationProtocol: userMedicationProtocolCoreSchema
      .omit({
        notes: true,
        active: true,
      })
      .optional(),
    priorWeight: weightMeasurementSchema.optional(),
  })
  .strict();

export const weightLogResponseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    value: z.number().positive(),
    unit: weightUnitSchema,
    measuredAt: z.string().datetime(),
    source: z.enum(["onboarding", "weekly_checkin", "manual"]),
    weeklyCheckinId: z.string().min(1).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const createWeightLogRequestSchema = z
  .object({
    value: z.number().positive(),
    unit: weightUnitSchema,
    measuredAt: z.string().datetime(),
    source: z.enum(["manual"]).default("manual"),
  })
  .strict();

const idempotencyKeySchema = z.string().trim().min(1).max(200).optional();

const dailyLogResponseBaseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    recordedAt: z.string().datetime(),
    idempotencyKey: z.string().min(1).optional(),
    deletedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const dailyLogCreateBaseSchema = z
  .object({
    recordedAt: z.string().datetime(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const logListQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

const mealLogMutableSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    source: mealLogSourceSchema.optional(),
    photoS3Key: z.string().trim().min(1).optional(),
    aiScanConfidence: z.number().min(0).max(100).optional(),
    foodName: z.string().trim().min(1),
    servingSize: z.string().trim().min(1).optional(),
    protein: z.number().min(0),
    calories: z.number().min(0),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    fiber: z.number().min(0).optional(),
    waterOz: z.number().min(0).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createMealLogRequestSchema = dailyLogCreateBaseSchema
  .merge(mealLogMutableSchema.omit({ recordedAt: true }).extend({ source: mealLogSourceSchema }))
  .strict();

export const patchMealLogRequestSchema = mealLogMutableSchema.partial().strict();

export const mealLogResponseSchema = dailyLogResponseBaseSchema
  .merge(mealLogMutableSchema.omit({ recordedAt: true }).extend({ source: mealLogSourceSchema }))
  .strict();

export const mealScanImageMimeTypeSchema = z.enum(["image/jpeg", "image/png"]);
export const mealScanModeSchema = z.enum(["affirmation", "swap"]);

export const mealScanRequestSchema = z
  .object({
    imageData: z.string().trim().min(1),
    imageMimeType: mealScanImageMimeTypeSchema,
    capturedAt: z.string().datetime().optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

/** Free-text meal the user types ("rice, beans and chicken") for the LLM to parse. */
export const mealParseRequestSchema = z
  .object({
    text: z.string().trim().min(2).max(200),
  })
  .strict();

/** A scanned product barcode (UPC/EAN) to look up in the food database. */
export const barcodeLookupRequestSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6,20}$/, "code must be a numeric barcode"),
  })
  .strict();

/** One part of a parsed composite meal. */
export const mealParseComponentSchema = z
  .object({
    name: z.string().trim().min(1),
    protein: z.number().nonnegative(),
    calories: z.number().nonnegative(),
  })
  .strict();

/** What the LLM returns for a typed meal: the whole meal plus its parts. */
export const mealParseResponseSchema = z
  .object({
    name: z.string().trim().min(1),
    components: z.array(mealParseComponentSchema).min(1).max(8),
    protein: z.number().nonnegative(),
    calories: z.number().nonnegative(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const mealScanAnalysisSchema = z
  .object({
    foodName: z.string().trim().min(1),
    servingSize: z.string().trim().min(1),
    protein: z.number().nonnegative(),
    calories: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    // Derived hydration/fiber estimates. Optional so older scans and engine
    // versions that predate them stay valid.
    fiber: z.number().nonnegative().optional(),
    waterOz: z.number().nonnegative().optional(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const mealScanAdjustedMacrosSchema = z
  .object({
    protein: z.number().nonnegative(),
    calories: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  })
  .strict();

export const mealScanCoachContentSchema = z
  .object({
    mode: mealScanModeSchema,
    callout: z.string().trim().min(1),
    swap: z
      .object({
        description: z.string().trim().min(1),
        additionalProtein: z.number().nonnegative(),
        additionalCalories: z.number().nonnegative(),
        adjustedMacros: mealScanAdjustedMacrosSchema,
      })
      .strict()
      .nullable(),
    copyVersion: z.string().trim().min(1),
  })
  .strict();

export const mealScanResponseSchema = z
  .object({
    scanId: z.string().min(1),
    photoS3Key: z.string().min(1),
    analysis: mealScanAnalysisSchema,
    coachContent: mealScanCoachContentSchema.nullable(),
    visionEngineVersion: z.string().min(1),
  })
  .strict();

// GET /meal-logs/:id/scan — the scan artifacts behind a logged meal (photo +
// what the coach said at confirm time). All nulls for manual/barcode logs.
export const mealLogScanDetailResponseSchema = z
  .object({
    photoViewUrl: z.string().nullable(),
    analysis: mealScanAnalysisSchema.nullable(),
    coachContent: mealScanCoachContentSchema.nullable(),
  })
  .strict();

export type MealLogScanDetailResponse = z.infer<typeof mealLogScanDetailResponseSchema>;

export const workoutLogSetSchema = z
  .object({
    reps: z.number().int().positive(),
    weight: z.number().positive().nullable(),
    unit: weightUnitSchema.nullable(),
  })
  .strict();

export const workoutLogExerciseSchema = z
  .object({
    name: z.string().trim().min(1),
    sets: z.array(workoutLogSetSchema).min(1),
    muscleGroups: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

const workoutLogMutableSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    workoutId: z.string().min(1).optional(),
    customWorkoutName: z.string().trim().min(1).optional(),
    exercises: z.array(workoutLogExerciseSchema).default([]),
    durationMinutes: z.number().int().positive(),
    countsAsResistance: z.boolean().optional(),
    perceivedEffort: workoutEffortSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createWorkoutLogRequestSchema = dailyLogCreateBaseSchema
  .merge(workoutLogMutableSchema.omit({ recordedAt: true }))
  .refine((value) => Boolean(value.workoutId || value.customWorkoutName), {
    message: "Either workoutId or customWorkoutName is required",
    path: ["workoutId"],
  });

export const patchWorkoutLogRequestSchema = workoutLogMutableSchema
  .partial()
  .refine((value) => !("workoutId" in value) || Boolean(value.workoutId || value.customWorkoutName), {
    message: "Either workoutId or customWorkoutName is required",
    path: ["workoutId"],
  });

export const workoutLogResponseSchema = dailyLogResponseBaseSchema
  .merge(
    workoutLogMutableSchema
      .omit({ recordedAt: true, countsAsResistance: true })
      .extend({ countsAsResistance: z.boolean() }),
  )
  .strict();

const doseLogMutableSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    medicationProtocolId: z.string().min(1),
    doseAmount: z.number().positive(),
    doseUnit: doseLogUnitSchema,
    injectionSite: doseInjectionSiteSchema.optional(),
    /** Self-reported injection pain, 0 (none) to 10 (worst). */
    painLevel: z.number().int().min(0).max(10).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createDoseLogRequestSchema = dailyLogCreateBaseSchema
  .merge(doseLogMutableSchema.omit({ recordedAt: true }))
  .strict();

export const patchDoseLogRequestSchema = doseLogMutableSchema.partial().strict();

export const doseLogResponseSchema = dailyLogResponseBaseSchema
  .merge(doseLogMutableSchema.omit({ recordedAt: true }))
  .strict();

export const bodyMeasurementsSchema = z
  .object({
    waist: z.number().positive().optional(),
    arm: z.number().positive().optional(),
    thigh: z.number().positive().optional(),
    hip: z.number().positive().optional(),
    chest: z.number().positive().optional(),
    neck: z.number().positive().optional(),
    forearm: z.number().positive().optional(),
    calf: z.number().positive().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((measurement) => measurement !== undefined), {
    message: "At least one measurement is required",
  });

const measurementLogMutableSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    measurements: bodyMeasurementsSchema,
    unit: measurementUnitSchema,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createMeasurementLogRequestSchema = dailyLogCreateBaseSchema
  .merge(measurementLogMutableSchema.omit({ recordedAt: true }))
  .strict();

export const patchMeasurementLogRequestSchema = measurementLogMutableSchema.partial().strict();

export const measurementLogResponseSchema = dailyLogResponseBaseSchema
  .merge(measurementLogMutableSchema.omit({ recordedAt: true }))
  .strict();

const sideEffectLogMutableSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    symptom: sideEffectSymptomSchema,
    customSymptom: z.string().trim().min(1).optional(),
    severity: z.number().int().min(1).max(5),
    durationHours: z.number().positive().optional(),
    relatedToDose: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createSideEffectLogRequestSchema = dailyLogCreateBaseSchema
  .merge(sideEffectLogMutableSchema.omit({ recordedAt: true }))
  .strict()
  .refine((value) => value.symptom !== "other" || Boolean(value.customSymptom), {
    message: "customSymptom is required when symptom is other",
    path: ["customSymptom"],
  });

export const patchSideEffectLogRequestSchema = sideEffectLogMutableSchema
  .partial()
  .strict()
  .refine((value) => value.symptom !== "other" || Boolean(value.customSymptom), {
    message: "customSymptom is required when symptom is other",
    path: ["customSymptom"],
  });

export const sideEffectLogResponseSchema = dailyLogResponseBaseSchema
  .merge(sideEffectLogMutableSchema.omit({ recordedAt: true }))
  .strict();

export const weeklyCheckinRequestSchema = z
  .object({
    weekOf: dateOnlySchema,
    weight: weightMeasurementSchema,
    proteinGramsPerDay: z.number().min(0).max(400),
    resistanceWorkoutsCompleted: z.number().int().min(0).max(14),
    sideEffects: z.array(z.string().trim().min(1)).default([]),
    notes: z.string().trim().max(2000).optional(),
    userContextSnapshot: userContextSnapshotSchema.optional(),
  })
  .strict();

export const weeklyCheckinResponseSchema = weeklyCheckinRequestSchema
  .extend({
    id: z.string().min(1),
    userId: z.string().min(1),
    userContextSnapshot: userContextSnapshotSchema,
    weightLogId: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const weeklyVerdictResponseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    weekOf: dateOnlySchema,
    checkinId: z.string().min(1).nullable(),
    source: verdictSourceSchema,
    engineVersion: z.string().min(1),
    copyVersion: z.string().min(1).nullable(),
    explanation: z.string().min(1).nullable(),
    status: verdictStatusSchema,
    score: z.number().min(0).max(100).nullable(),
    estimatedLeanMassRisk: z.number().min(0).max(1).nullable(),
    nextActionCode: z.string().min(1),
    headline: z.string().min(1),
    message: z.string().min(1),
    explanationFactors: z.array(z.string().min(1)),
    inputsUsed: userContextSnapshotSchema
      .extend({
        weight: weightMeasurementSchema.optional(),
        proteinGramsPerDay: z.number().min(0).max(400).optional(),
        resistanceWorkoutsCompleted: z.number().int().min(0).max(14).optional(),
        dataSource: z
          .object({
            protein: verdictInputDataSourceSchema,
            training: verdictInputDataSourceSchema,
          })
          .strict()
          .optional(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

// Check-in history: each past check-in paired with the verdict it produced
// (verdict is null for any check-in that did not generate one).
export const weeklyCheckinHistoryItemSchema = z
  .object({
    checkin: weeklyCheckinResponseSchema,
    verdict: weeklyVerdictResponseSchema.nullable(),
  })
  .strict();

export const weeklyCheckinHistoryResponseSchema = z.array(weeklyCheckinHistoryItemSchema);

export const latestWeeklyVerdictResponseSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("available"),
      verdict: weeklyVerdictResponseSchema,
      message: z.null(),
    })
    .strict(),
  z
    .object({
      status: z.literal("still_gathering"),
      verdict: z.null(),
      message: z.string().min(1),
    })
    .strict(),
]);

export const stallDiagnosticResponseSchema = z
  .object({
    stalled: z.boolean(),
    daysSinceWeightChange: z.number().int().nonnegative(),
    deterministicAnalysis: z
      .object({
        weightTrend: z
          .object({
            daysFlat: z.number().int().nonnegative(),
            startWeight: z.number().nonnegative(),
            endWeight: z.number().nonnegative(),
            unit: weightUnitSchema,
          })
          .strict(),
        proteinTrend: z
          .object({
            recentAvgGrams: z.number().nonnegative(),
            priorAvgGrams: z.number().nonnegative(),
            deltaGrams: z.number(),
          })
          .strict(),
        trainingTrend: z
          .object({
            recentSessionsCount: z.number().int().nonnegative(),
            recentSessionsTarget: z.number().int().nonnegative(),
            priorSessionsCount: z.number().int().nonnegative(),
            priorSessionsTarget: z.number().int().nonnegative(),
          })
          .strict(),
        doseTrend: z
          .object({
            recentDoses: z.number().int().nonnegative(),
            missedDoses: z.number().int().nonnegative(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    explanation: z.string().min(1).nullable(),
    suggestedFix: z.string().min(1).nullable(),
    copyVersion: z.string().min(1).nullable(),
    engineVersion: z.string().min(1),
  })
  .strict();

export const COACH_CHAT_MAX_MESSAGES = 16;
export const COACH_CHAT_MAX_CONTENT_LENGTH = 600;

export const coachChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(COACH_CHAT_MAX_CONTENT_LENGTH),
  })
  .strict();

export const coachChatRequestSchema = z
  .object({
    messages: z
      .array(coachChatMessageSchema)
      .min(1)
      .max(COACH_CHAT_MAX_MESSAGES)
      .refine((messages) => messages[messages.length - 1]?.role === "user", {
        message: "The final message must come from the user",
      }),
  })
  .strict();

export const coachChatResponseSchema = z
  .object({
    reply: z.string().min(1),
    refused: z.boolean(),
  })
  .strict();

export const onboardingCompleteRequestSchema = z
  .object({
    profile: userProfileInputSchema,
    medicationProtocol: userMedicationProtocolCoreSchema.nullable(),
    initialWeight: weightMeasurementSchema,
  })
  .strict();

export const onboardingCompleteResponseSchema = z
  .object({
    user: userResponseSchema,
    profile: userProfileResponseSchema,
    medicationProtocol: userMedicationProtocolResponseSchema.nullable(),
    weightLog: weightLogResponseSchema,
  })
  .strict();

export const workoutExerciseSchema = z
  .object({
    name: z.string().min(1),
    sets: z.number().int().positive(),
    reps: z.string().min(1),
    restSeconds: z.number().int().nonnegative(),
    muscleGroups: z.array(z.string().min(1)).min(1),
    notes: z.string().nullable(),
  })
  .strict();

export const workoutResponseSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    shortDescription: z.string().min(1),
    focus: leanientFocusAreaSchema,
    energyPhase: workoutEnergyPhaseSchema,
    durationMinutes: z.number().int().positive(),
    difficulty: workoutDifficultySchema,
    equipment: workoutEquipmentSchema,
    intensity: workoutIntensitySchema,
    muscleGroups: z.array(z.string().min(1)).min(1),
    category: workoutCategorySchema,
    exercises: z.array(workoutExerciseSchema).min(1),
    safetyNotes: z.array(z.string().min(1)),
    tags: z.array(z.string().min(1)),
    version: z.number().int().positive(),
    active: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const shotDayContextResponseSchema = z
  .object({
    isOnProtocol: z.boolean(),
    shotDayLabel: z.string().min(1).nullable(),
    daysUntilNextDose: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const featuredWorkoutResponseSchema = z
  .object({
    workout: workoutResponseSchema,
    selectionReason: workoutSelectionReasonSchema,
    coachCopy: z.string().min(1).nullable(),
    coachCopyVersion: z.string().min(1).nullable(),
  })
  .strict();

export const trainingTodayResponseSchema = z
  .object({
    sessionsThisWeek: z.number().int().nonnegative(),
    weeklyTarget: z.number().int().positive(),
    shotDayContext: shotDayContextResponseSchema,
    featuredWorkout: featuredWorkoutResponseSchema.nullable(),
    recommendationEngineVersion: z.string().min(1),
  })
  .strict();

export const muscleRetentionSnapshotResponseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    weekOf: z.string().datetime(),
    proteinScore: z.number().min(0).max(100),
    trainingScore: z.number().min(0).max(100),
    paceScore: z.number().min(0).max(100),
    muscleRetentionScore: z.number().min(0).max(100),
    retentionLabel: muscleRetentionLabelSchema,
    weeklyWeightLossLb: z.number(),
    cumulativeWeightLossLb: z.number(),
    inputsUsed: z
      .object({
        avgDailyProteinGrams: z.number().nonnegative(),
        sessionsCompleted: z.number().int().nonnegative(),
        weeklyWorkoutTarget: z.number().int().positive(),
        dailyProteinTarget: z.number().positive(),
        startWeight: z.number().nonnegative(),
        endWeight: z.number().nonnegative(),
        dataSource: z
          .object({
            protein: verdictInputDataSourceSchema,
            training: verdictInputDataSourceSchema,
            weight: verdictInputDataSourceSchema,
          })
          .strict(),
      })
      .strict(),
    engineVersion: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const progressOverviewResponseSchema = z
  .object({
    chart: z
      .object({
        snapshots: z.array(muscleRetentionSnapshotResponseSchema),
        currentLabel: muscleRetentionLabelSchema,
        currentScore: z.number().min(0).max(100),
      })
      .strict(),
    summary: z
      .object({
        weeksOnProtocol: z.number().int().nonnegative(),
        medicationName: z.string().min(1).nullable(),
        startingWeight: z.number().nonnegative(),
        currentWeight: z.number().nonnegative(),
        totalWeightLoss: z.number(),
        targetWeight: z.number().positive(),
        remainingToTarget: z.number(),
        estimatedFatLostLb: z.number().nonnegative(),
        estimatedMuscleLostLb: z.number().nonnegative(),
        fatShareOfLossPct: z.number().min(0).max(100),
      })
      .strict(),
    engineVersion: z.string().min(1),
  })
  .strict();

export const todaysFocusCoachContentSchema = z
  .object({
    headline: z.string().min(1),
    suggestion: z.string().min(1),
    actionType: todaysFocusActionTypeSchema,
    actionLabel: z.string().min(1).nullable(),
    copyVersion: z.string().min(1),
  })
  .strict();

export const todaysFocusInputsSnapshotSchema = z
  .object({
    proteinLoggedToday: z.number().nonnegative(),
    proteinTargetToday: z.number().positive(),
    sessionsThisWeek: z.number().int().nonnegative(),
    weeklyTarget: z.number().int().positive(),
    shotDayLabel: z.string().min(1).nullable(),
    energy: z.enum(["good", "mid", "low"]).nullable(),
    daysSinceLastActivity: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const todaysFocusRecordSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    utcDate: z.string().datetime(),
    category: focusCategorySchema,
    selectionReason: z.string().min(1),
    coachContent: todaysFocusCoachContentSchema.nullable(),
    inputsSnapshot: todaysFocusInputsSnapshotSchema,
    engineVersion: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const todaysFocusResponseSchema = z
  .object({
    category: focusCategorySchema,
    headline: z.string().min(1).nullable(),
    suggestion: z.string().min(1).nullable(),
    actionType: todaysFocusActionTypeSchema,
    actionLabel: z.string().min(1).nullable(),
    selectionReason: z.string().min(1),
    engineVersion: z.string().min(1),
    generatedAt: z.string().datetime(),
  })
  .strict();

export const progressPhotoResponseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    captureDate: dateOnlySchema,
    s3Key: z.string().min(1),
    contentType: z.string().min(1),
    sizeBytes: z.number().int().positive().optional(),
    status: progressPhotoStatusSchema,
    kind: progressPhotoKindSchema.default("body"),
    faceFullness: faceFullnessSchema.optional(),
    viewUrl: z.string().url().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const progressPhotoUploadIntentRequestSchema = z
  .object({
    captureDate: dateOnlySchema,
    contentType: z.enum(["image/jpeg", "image/png", "image/heic", "image/webp"]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024)
      .optional(),
    kind: progressPhotoKindSchema.default("body"),
    faceFullness: faceFullnessSchema.optional(),
  })
  .strict();

export const progressPhotoUploadIntentResponseSchema = z
  .object({
    photo: progressPhotoResponseSchema,
    uploadUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export const progressPhotoConfirmRequestSchema = z
  .object({
    photoId: z.string().min(1),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024),
  })
  .strict();

export const progressPhotoViewUrlResponseSchema = z
  .object({
    photo: progressPhotoResponseSchema,
    viewUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export const subscriptionEventResponseSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1).optional(),
    revenueCatEventId: z.string().min(1).optional(),
    revenueCatCustomerId: z.string().min(1).optional(),
    eventType: z.string().min(1),
    productId: z.string().min(1).optional(),
    entitlementId: z.string().min(1).optional(),
    status: subscriptionStatusSchema,
    rawEvent: z.unknown(),
    receivedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GoogleSignInRequest = z.infer<typeof googleSignInRequestSchema>;
export type AppleSignInRequest = z.infer<typeof appleSignInRequestSchema>;
export type PatchMeRequest = z.infer<typeof patchMeRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponseBody = z.infer<typeof authResponseSchema>;
export type PatchUserProfileRequest = z.infer<typeof patchUserProfileRequestSchema>;
export type PatchUserMedicationProtocolRequest = z.infer<
  typeof patchUserMedicationProtocolRequestSchema
>;
export type CreateWeightLogRequest = z.infer<typeof createWeightLogRequestSchema>;
export type LogListQuery = z.infer<typeof logListQuerySchema>;
export type CreateMealLogRequest = z.infer<typeof createMealLogRequestSchema>;
export type PatchMealLogRequest = z.infer<typeof patchMealLogRequestSchema>;
export type MealScanRequestBody = z.infer<typeof mealScanRequestSchema>;
export type MealParseRequestBody = z.infer<typeof mealParseRequestSchema>;
export type BarcodeLookupRequestBody = z.infer<typeof barcodeLookupRequestSchema>;
export type MealParseComponent = z.infer<typeof mealParseComponentSchema>;
export type MealParseResponse = z.infer<typeof mealParseResponseSchema>;
export type CreateWorkoutLogRequest = z.infer<typeof createWorkoutLogRequestSchema>;
export type PatchWorkoutLogRequest = z.infer<typeof patchWorkoutLogRequestSchema>;
export type CreateDoseLogRequest = z.infer<typeof createDoseLogRequestSchema>;
export type PatchDoseLogRequest = z.infer<typeof patchDoseLogRequestSchema>;
export type CreateMeasurementLogRequest = z.infer<typeof createMeasurementLogRequestSchema>;
export type PatchMeasurementLogRequest = z.infer<typeof patchMeasurementLogRequestSchema>;
export type CreateSideEffectLogRequest = z.infer<typeof createSideEffectLogRequestSchema>;
export type PatchSideEffectLogRequest = z.infer<typeof patchSideEffectLogRequestSchema>;
export type WeeklyCheckinRequest = z.infer<typeof weeklyCheckinRequestSchema>;
export type LatestWeeklyVerdictResponseBody = z.infer<
  typeof latestWeeklyVerdictResponseSchema
>;
export type CoachChatRequestBody = z.infer<typeof coachChatRequestSchema>;
export type CoachChatResponseBody = z.infer<typeof coachChatResponseSchema>;
export type OnboardingCompleteRequest = z.infer<typeof onboardingCompleteRequestSchema>;
export type ProgressPhotoUploadIntentRequest = z.infer<
  typeof progressPhotoUploadIntentRequestSchema
>;
export type ProgressPhotoConfirmRequest = z.infer<typeof progressPhotoConfirmRequestSchema>;
export type AvatarUploadIntentRequest = z.infer<typeof avatarUploadIntentRequestSchema>;
export type AvatarUploadIntentResponse = z.infer<typeof avatarUploadIntentResponseSchema>;
export type AvatarConfirmRequest = z.infer<typeof avatarConfirmRequestSchema>;
export type AvatarViewUrlResponse = z.infer<typeof avatarViewUrlResponseSchema>;
export type WeeklyCheckinHistoryItem = z.infer<typeof weeklyCheckinHistoryItemSchema>;
export type WeeklyCheckinHistoryResponse = z.infer<typeof weeklyCheckinHistoryResponseSchema>;
