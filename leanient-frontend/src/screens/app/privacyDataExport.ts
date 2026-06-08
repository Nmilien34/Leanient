import type {
  DoseLog,
  LatestWeeklyVerdictResponse,
  MealLog,
  ProgressOverviewResponse,
  ProgressPhoto,
  TrainingTodayResponse,
  UserMedicationProtocol,
  UserProfile,
  WeeklyVerdict,
  WeightLog,
  WorkoutLog,
} from "@leanient/shared";

export interface PrivacyDataExportInput {
  profile: UserProfile | null;
  medicationProtocol: UserMedicationProtocol | null;
  latestVerdictStatus: LatestWeeklyVerdictResponse["status"] | null;
  latestVerdictMessage: string | null;
  latestVerdict: WeeklyVerdict | null;
  weightLogs: WeightLog[];
  recentDoseLogs: DoseLog[];
  todaysMeals: MealLog[];
  todaysWorkouts: WorkoutLog[];
  progressOverview: ProgressOverviewResponse | null;
  trainingToday: TrainingTodayResponse | null;
  progressPhotos: ProgressPhoto[];
}

export interface PrivacyDataExportPayload {
  app: "Leanient";
  exportedAt: string;
  profile: UserProfile | null;
  medicationProtocol: UserMedicationProtocol | null;
  verdict: {
    status: LatestWeeklyVerdictResponse["status"] | null;
    message: string | null;
    latest: WeeklyVerdict | null;
  };
  logs: {
    weightLogs: WeightLog[];
    recentDoseLogs: DoseLog[];
    todaysMeals: MealLog[];
    todaysWorkouts: WorkoutLog[];
  };
  progress: {
    overview: ProgressOverviewResponse | null;
    photos: ProgressPhotoExportMetadata[];
  };
  trainingToday: TrainingTodayResponse | null;
}

export interface ProgressPhotoExportMetadata {
  id: string;
  captureDate: string;
  contentType: string;
  sizeBytes?: number;
  status: ProgressPhoto["status"];
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyDataExportShareContent {
  title: string;
  message: string;
}

export function buildPrivacyDataExportPayload(
  input: PrivacyDataExportInput,
  now = new Date(),
): PrivacyDataExportPayload {
  return {
    app: "Leanient",
    exportedAt: now.toISOString(),
    profile: input.profile,
    medicationProtocol: input.medicationProtocol,
    verdict: {
      status: input.latestVerdictStatus,
      message: input.latestVerdictMessage,
      latest: input.latestVerdict,
    },
    logs: {
      weightLogs: input.weightLogs,
      recentDoseLogs: input.recentDoseLogs,
      todaysMeals: input.todaysMeals,
      todaysWorkouts: input.todaysWorkouts,
    },
    progress: {
      overview: input.progressOverview,
      photos: input.progressPhotos.map(toProgressPhotoExportMetadata),
    },
    trainingToday: input.trainingToday,
  };
}

export function buildPrivacyDataExportShareContent(
  payload: PrivacyDataExportPayload,
): PrivacyDataExportShareContent {
  return {
    title: "Leanient data export",
    message: JSON.stringify(payload, null, 2),
  };
}

function toProgressPhotoExportMetadata(photo: ProgressPhoto): ProgressPhotoExportMetadata {
  return {
    id: photo.id,
    captureDate: photo.captureDate,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
    status: photo.status,
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
  };
}
