import type {
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

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export type VerdictStatus = (typeof VERDICT_STATUSES)[number];
export type VerdictSource = (typeof VERDICT_SOURCES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type GoalPace = (typeof GOAL_PACES)[number];
export type Sex = (typeof SEX_VALUES)[number];
export type JourneyStage = (typeof JOURNEY_STAGES)[number];
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];
export type EquipmentAccess = (typeof EQUIPMENT_ACCESS_OPTIONS)[number];
export type LeanientFocusArea = (typeof LEANIENT_FOCUS_AREAS)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export type DoseUnit = (typeof DOSE_UNITS)[number];
export type WorkoutDifficulty = (typeof WORKOUT_DIFFICULTIES)[number];
export type WorkoutEnergyPhase = (typeof WORKOUT_ENERGY_PHASES)[number];
export type WorkoutEquipment = (typeof WORKOUT_EQUIPMENT_OPTIONS)[number];
export type WorkoutIntensity = (typeof WORKOUT_INTENSITIES)[number];
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];
export type WorkoutSelectionReason = (typeof WORKOUT_SELECTION_REASONS)[number];
export type ProgressPhotoStatus = (typeof PROGRESS_PHOTO_STATUSES)[number];
export type MealLogSource = (typeof MEAL_LOG_SOURCES)[number];
export type WorkoutEffort = (typeof WORKOUT_EFFORTS)[number];
export type DoseLogUnit = (typeof DOSE_LOG_UNITS)[number];
export type DoseInjectionSite = (typeof DOSE_INJECTION_SITES)[number];
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];
export type SideEffectSymptom = (typeof SIDE_EFFECT_SYMPTOMS)[number];
export type VerdictInputDataSource = (typeof VERDICT_INPUT_DATA_SOURCES)[number];
export type MuscleRetentionLabel = (typeof MUSCLE_RETENTION_LABELS)[number];
export type FocusCategory = (typeof FOCUS_CATEGORIES)[number];
export type TodaysFocusActionType = (typeof TODAYS_FOCUS_ACTION_TYPES)[number];

export interface LinkedAuthProvider {
  provider: AuthProvider;
  providerUserId: string;
  linkedAt: string;
}

export interface User {
  id: string;
  email?: string;
  emailVerified: boolean;
  onboardingComplete: boolean;
  authProviders: LinkedAuthProvider[];
  displayName?: string;
  /** Profile photo from the OAuth provider (Google/Apple), if any. */
  avatarUrl?: string;
  /** True when the user has uploaded their own avatar to S3. Takes precedence
   * over avatarUrl; fetch the displayable URL from GET /me/avatar/view-url. */
  hasAvatar: boolean;
  subscriptionStatus: SubscriptionStatus;
  entitlementExpiresAt?: string;
  subscriptionWillRenew: boolean;
  revenueCatCustomerId?: string;
  revenueCatEntitlement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface WeightMeasurement {
  value: number;
  unit: WeightUnit;
  measuredAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  journeyStage: JourneyStage;
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  goalPace: GoalPace;
  biggestFear: LeanientFocusArea;
  trainingStatus: TrainingStatus;
  equipmentAccess: EquipmentAccess;
  weeklyWorkoutTarget: number;
  sideEffectBaseline: string[];
  timezone: string;
  /**
   * Biological inputs for the Mifflin-St Jeor calorie model. Optional on the
   * response because legacy profiles predate them; `needsNutritionInputUpdate`
   * flags those records so the app can prompt the user to fill them in.
   */
  sex?: Sex;
  ageYears?: number;
  heightInches?: number;
  /** Engine that produced the current targets (see NUTRITION_ENGINE_VERSION). */
  nutritionEngineVersion: string;
  /** True when sex/ageYears/heightInches are missing, so targets are stale. */
  needsNutritionInputUpdate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationCatalogItem {
  id: string;
  slug: string;
  genericName: string;
  brandNames: string[];
  drugClass: "glp_1" | "dual_glp_1_gip" | "other";
  doseUnits: DoseUnit[];
  supportedDoseValues: number[];
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserMedicationProtocol {
  id: string;
  userId: string;
  medicationCatalogId?: string;
  medicationName: string;
  customMedicationName?: string;
  doseAmount?: number;
  doseUnit: DoseUnit;
  shotDays: Weekday[];
  startDate: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserContextSnapshot {
  profile: {
    journeyStage: JourneyStage;
    goalWeight: number;
    goalWeightUnit: WeightUnit;
    dailyProteinTarget: number;
    dailyCalorieTarget: number;
    goalPace: GoalPace;
    biggestFear: LeanientFocusArea;
    trainingStatus: TrainingStatus;
    equipmentAccess: EquipmentAccess;
    weeklyWorkoutTarget: number;
    sideEffectBaseline: string[];
    timezone: string;
  };
  medicationProtocol?: {
    medicationCatalogId?: string;
    medicationName: string;
    customMedicationName?: string;
    doseAmount?: number;
    doseUnit: DoseUnit;
    shotDays: Weekday[];
    startDate: string;
  };
  priorWeight?: WeightMeasurement;
}

export interface WeightLog {
  id: string;
  userId: string;
  value: number;
  unit: WeightUnit;
  measuredAt: string;
  source: "onboarding" | "weekly_checkin" | "manual";
  weeklyCheckinId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingCompleteResponse {
  user: User;
  profile: UserProfile;
  medicationProtocol: UserMedicationProtocol;
  weightLog: WeightLog;
}

export interface DailyLogBase {
  id: string;
  userId: string;
  recordedAt: string;
  idempotencyKey?: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealLog extends DailyLogBase {
  source: MealLogSource;
  photoS3Key?: string;
  aiScanConfidence?: number;
  foodName: string;
  servingSize?: string;
  protein: number;
  calories: number;
  carbs?: number;
  fat?: number;
  notes?: string;
}

export type MealScanImageMimeType = "image/jpeg" | "image/png";
export type MealScanMode = "affirmation" | "swap";

export interface MealScanRequest {
  imageData: string;
  imageMimeType: MealScanImageMimeType;
  capturedAt?: string;
  idempotencyKey?: string;
}

export interface MealScanAnalysis {
  foodName: string;
  servingSize: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface MealScanAdjustedMacros {
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

export interface MealScanSwap {
  description: string;
  additionalProtein: number;
  additionalCalories: number;
  adjustedMacros: MealScanAdjustedMacros;
}

export interface MealScanCoachContent {
  mode: MealScanMode;
  callout: string;
  swap: MealScanSwap | null;
  copyVersion: string;
}

export interface MealScanResponse {
  scanId: string;
  photoS3Key: string;
  analysis: MealScanAnalysis;
  coachContent: MealScanCoachContent | null;
  visionEngineVersion: string;
}

export interface WorkoutLogSet {
  reps: number;
  weight: number | null;
  unit: WeightUnit | null;
}

export interface WorkoutLogExercise {
  name: string;
  sets: WorkoutLogSet[];
  muscleGroups: string[];
}

export interface WorkoutLog extends DailyLogBase {
  workoutId?: string;
  customWorkoutName?: string;
  exercises: WorkoutLogExercise[];
  durationMinutes: number;
  countsAsResistance: boolean;
  perceivedEffort?: WorkoutEffort;
  notes?: string;
}

export interface DoseLog extends DailyLogBase {
  medicationProtocolId: string;
  doseAmount: number;
  doseUnit: DoseLogUnit;
  injectionSite?: DoseInjectionSite;
  notes?: string;
}

export interface BodyMeasurements {
  waist?: number;
  arm?: number;
  thigh?: number;
  hip?: number;
  chest?: number;
  neck?: number;
  forearm?: number;
  calf?: number;
}

export interface MeasurementLog extends DailyLogBase {
  measurements: BodyMeasurements;
  unit: MeasurementUnit;
  notes?: string;
}

export interface SideEffectLog extends DailyLogBase {
  symptom: SideEffectSymptom;
  customSymptom?: string;
  severity: number;
  durationHours?: number;
  relatedToDose?: boolean;
  notes?: string;
}

export interface WeeklyCheckin {
  id: string;
  userId: string;
  weekOf: string;
  weight: WeightMeasurement;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  sideEffects: string[];
  notes?: string;
  userContextSnapshot: UserContextSnapshot;
  weightLogId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyVerdict {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export type LatestWeeklyVerdictResponse =
  | {
      status: "available";
      verdict: WeeklyVerdict;
      message: null;
    }
  | {
      status: "still_gathering";
      verdict: null;
      message: string;
    };

export interface StallDeterministicAnalysis {
  weightTrend: {
    daysFlat: number;
    startWeight: number;
    endWeight: number;
    unit: WeightUnit;
  };
  proteinTrend: {
    recentAvgGrams: number;
    priorAvgGrams: number;
    deltaGrams: number;
  };
  trainingTrend: {
    recentSessionsCount: number;
    recentSessionsTarget: number;
    priorSessionsCount: number;
    priorSessionsTarget: number;
  };
  doseTrend: {
    recentDoses: number;
    missedDoses: number;
  } | null;
}

export interface StallDiagnosticResponse {
  stalled: boolean;
  daysSinceWeightChange: number;
  deterministicAnalysis: StallDeterministicAnalysis;
  explanation: string | null;
  suggestedFix: string | null;
  copyVersion: string | null;
  engineVersion: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroups: string[];
  notes: string | null;
}

export interface Workout {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  focus: LeanientFocusArea;
  energyPhase: WorkoutEnergyPhase;
  durationMinutes: number;
  difficulty: WorkoutDifficulty;
  equipment: WorkoutEquipment;
  intensity: WorkoutIntensity;
  muscleGroups: string[];
  category: WorkoutCategory;
  exercises: WorkoutExercise[];
  safetyNotes: string[];
  tags: string[];
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShotDayContext {
  isOnProtocol: boolean;
  shotDayLabel: string | null;
  daysUntilNextDose: number | null;
}

export interface FeaturedWorkout {
  workout: Workout;
  selectionReason: WorkoutSelectionReason;
  coachCopy: string | null;
  coachCopyVersion: string | null;
}

export interface TrainingTodayResponse {
  sessionsThisWeek: number;
  weeklyTarget: number;
  shotDayContext: ShotDayContext;
  featuredWorkout: FeaturedWorkout | null;
  recommendationEngineVersion: string;
}

export interface MuscleRetentionSnapshot {
  id: string;
  userId: string;
  weekOf: string;
  proteinScore: number;
  trainingScore: number;
  paceScore: number;
  muscleRetentionScore: number;
  retentionLabel: MuscleRetentionLabel;
  weeklyWeightLossLb: number;
  cumulativeWeightLossLb: number;
  inputsUsed: {
    avgDailyProteinGrams: number;
    sessionsCompleted: number;
    weeklyWorkoutTarget: number;
    dailyProteinTarget: number;
    startWeight: number;
    endWeight: number;
    dataSource: {
      protein: VerdictInputDataSource;
      training: VerdictInputDataSource;
      weight: VerdictInputDataSource;
    };
  };
  engineVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressOverviewResponse {
  chart: {
    snapshots: MuscleRetentionSnapshot[];
    currentLabel: MuscleRetentionLabel;
    currentScore: number;
  };
  summary: {
    weeksOnProtocol: number;
    medicationName: string | null;
    startingWeight: number;
    currentWeight: number;
    totalWeightLoss: number;
    targetWeight: number;
    remainingToTarget: number;
  };
  engineVersion: string;
}

export interface TodaysFocusCoachContent {
  headline: string;
  suggestion: string;
  actionType: TodaysFocusActionType;
  actionLabel: string | null;
  copyVersion: string;
}

export interface TodaysFocusInputsSnapshot {
  proteinLoggedToday: number;
  proteinTargetToday: number;
  sessionsThisWeek: number;
  weeklyTarget: number;
  shotDayLabel: string | null;
  energy: "good" | "mid" | "low" | null;
  daysSinceLastActivity: number | null;
}

export interface TodaysFocus {
  id: string;
  userId: string;
  utcDate: string;
  category: FocusCategory;
  selectionReason: string;
  coachContent: TodaysFocusCoachContent | null;
  inputsSnapshot: TodaysFocusInputsSnapshot;
  engineVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodaysFocusResponse {
  category: FocusCategory;
  headline: string | null;
  suggestion: string | null;
  actionType: TodaysFocusActionType;
  actionLabel: string | null;
  selectionReason: string;
  engineVersion: string;
  generatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  captureDate: string;
  s3Key: string;
  contentType: string;
  sizeBytes?: number;
  status: ProgressPhotoStatus;
  viewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEvent {
  id: string;
  userId?: string;
  revenueCatEventId?: string;
  revenueCatCustomerId?: string;
  eventType: string;
  productId?: string;
  entitlementId?: string;
  status: SubscriptionStatus;
  rawEvent: unknown;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}
