export const AUTH_PROVIDERS = ["google", "apple"] as const;

export const VERDICT_STATUSES = ["on_track", "drifting", "losing_muscle", "no_data"] as const;

export const VERDICT_SOURCES = ["checkin", "cron_backfill", "cron_no_data"] as const;

export const SUBSCRIPTION_STATUSES = [
  "free",
  "trialing",
  "active",
  "active_canceled",
  "past_due",
  "canceled",
  "refunded",
] as const;

export const WEIGHT_UNITS = ["lb", "kg"] as const;

export const GOAL_PACES = ["gentle", "steady", "aggressive"] as const;

// Biological sex used by the Mifflin-St Jeor calorie model. Onboarding collects
// male/female only (a biological input, separate from gender identity).
export const SEX_VALUES = ["male", "female"] as const;

// Nutrition engine versions stamped onto each profile's computed targets.
// v2 is the current Mifflin-St Jeor backend computation. Legacy profiles created
// under the old frontend heuristic are lazily stamped v1 on read.
export const NUTRITION_ENGINE_VERSION = "v2.0-mifflin-st-jeor";
export const NUTRITION_ENGINE_VERSION_LEGACY = "v1.0-heuristic";

export const JOURNEY_STAGES = ["pre_start", "active_loss", "maintenance"] as const;

export const TRAINING_STATUSES = ["not_training", "beginner", "consistent", "returning"] as const;

export const EQUIPMENT_ACCESS_OPTIONS = [
  "none",
  "bodyweight_only",
  "dumbbells",
  "full_gym",
] as const;

export const LEANIENT_FOCUS_AREAS = [
  "losing_muscle",
  "ozempic_face",
  "strength",
  "energy",
  "side_effects",
  "confidence",
] as const;

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const DOSE_UNITS = ["mg", "units"] as const;

export const WORKOUT_DIFFICULTIES = ["beginner", "intermediate"] as const;

export const WORKOUT_ENERGY_PHASES = [
  "shot_day",
  "low_energy",
  "steady_energy",
  "high_energy",
] as const;

export const WORKOUT_EQUIPMENT_OPTIONS = [
  "none",
  "bodyweight",
  "dumbbells",
  "minimal",
  "gym",
  "gentle",
] as const;

export const WORKOUT_INTENSITIES = ["easy", "moderate", "hard", "recovery"] as const;

export const WORKOUT_CATEGORIES = ["strength", "mobility", "recovery", "conditioning"] as const;

export const WORKOUT_SELECTION_REASONS = [
  "shot_day_recovery",
  "low_energy",
  "behind_target",
  "strength_rotation",
  "default",
] as const;

export const PROGRESS_PHOTO_STATUSES = ["pending_upload", "uploaded", "deleted"] as const;

// "face" photos are the front-pose face checks that feed the face-progress
// timeline; everything else is a "body" progress photo. Default is body so
// existing photos and older clients stay valid.
export const PROGRESS_PHOTO_KINDS = ["body", "face"] as const;

export const MEAL_LOG_SOURCES = ["photo_scan", "manual", "barcode"] as const;

export const WORKOUT_EFFORTS = ["easy", "normal", "hard"] as const;

export const DOSE_LOG_UNITS = ["mg", "ml", "units", "mcg"] as const;

export const DOSE_INJECTION_SITES = [
  "abdomen_left",
  "abdomen_right",
  "thigh_left",
  "thigh_right",
  "arm_left",
  "arm_right",
  "buttock_left",
  "buttock_right",
] as const;

export const MEASUREMENT_UNITS = ["in", "cm"] as const;

export const SIDE_EFFECT_SYMPTOMS = [
  "nausea",
  "fatigue",
  "gi",
  "headache",
  "reflux",
  "dizziness",
  "appetite_loss",
  "other",
] as const;

export const VERDICT_INPUT_DATA_SOURCES = ["logs", "checkin_fallback"] as const;

export const MUSCLE_RETENTION_LABELS = [
  "keeping_muscle",
  "maintaining",
  "losing_some",
  "losing_muscle",
] as const;

export const FOCUS_CATEGORIES = [
  "onboarding_nudge",
  "shot_day_recovery",
  "training_gap",
  "protein_gap",
  "steady_state",
] as const;

export const TODAYS_FOCUS_ACTION_TYPES = [
  "log_meal",
  "log_workout",
  "log_dose",
  "take_photo",
  "view_progress",
  "none",
] as const;

export const API_ROUTES = {
  health: "/healthz",
  auth: {
    google: "/auth/google",
    apple: "/auth/apple",
    logout: "/auth/logout",
  },
  me: "/me",
  onboarding: {
    complete: "/onboarding/complete",
  },
  weightLogs: "/weight-logs",
  mealLogs: "/meal-logs",
  mealScans: "/meal-scans/analyze",
  workoutLogs: "/workout-logs",
  doseLogs: "/dose-logs",
  measurementLogs: "/measurement-logs",
  sideEffectLogs: "/side-effect-logs",
  weeklyCheckins: "/weekly-checkins",
  weeklyVerdicts: {
    latest: "/weekly-verdicts/latest",
  },
  workouts: {
    root: "/workouts",
    recommended: "/workouts/recommended",
  },
  training: {
    today: "/training/today",
  },
  medications: "/medications",
  progressPhotos: "/progress-photos",
  progress: {
    overview: "/progress/overview",
  },
  home: {
    focus: "/home/focus",
  },
  diagnostics: {
    stall: "/diagnostics/stall",
  },
  webhooks: {
    revenueCat: "/webhooks/revenuecat",
  },
} as const;

export const ERROR_CODES = {
  authInvalidToken: "AUTH_INVALID_TOKEN",
  authMissingToken: "AUTH_MISSING_TOKEN",
  authProviderRejected: "AUTH_PROVIDER_REJECTED",
  badRequest: "BAD_REQUEST",
  conflict: "CONFLICT",
  databaseUnavailable: "DATABASE_UNAVAILABLE",
  internal: "INTERNAL_ERROR",
  invalidImage: "INVALID_IMAGE",
  mealScanStorageFailed: "MEAL_SCAN_STORAGE_FAILED",
  mealScanVisionFailed: "MEAL_SCAN_VISION_FAILED",
  notFound: "NOT_FOUND",
  rateLimited: "RATE_LIMITED",
  validation: "VALIDATION_ERROR",
} as const;
