import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import {
  appleSignInRequestSchema,
  authResponseSchema,
  computeWeeklyWorkoutTarget,
  createDoseLogRequestSchema,
  createMealLogRequestSchema,
  createMeasurementLogRequestSchema,
  createSideEffectLogRequestSchema,
  createWeightLogRequestSchema,
  createWorkoutLogRequestSchema,
  doseLogResponseSchema,
  googleSignInRequestSchema,
  inferEquipmentAccessFromTrainingStatus,
  latestWeeklyVerdictResponseSchema,
  mealLogResponseSchema,
  mealScanRequestSchema,
  mealScanResponseSchema,
  measurementLogResponseSchema,
  stallDiagnosticResponseSchema,
  medicationCatalogItemResponseSchema,
  onboardingCompleteRequestSchema,
  onboardingCompleteResponseSchema,
  patchMeRequestSchema,
  patchUserMedicationProtocolRequestSchema,
  patchUserProfileRequestSchema,
  progressPhotoConfirmRequestSchema,
  progressPhotoResponseSchema,
  progressPhotoUploadIntentRequestSchema,
  progressPhotoUploadIntentResponseSchema,
  progressPhotoViewUrlResponseSchema,
  progressOverviewResponseSchema,
  sideEffectLogResponseSchema,
  todaysFocusResponseSchema,
  trainingTodayResponseSchema,
  userMedicationProtocolResponseSchema,
  userProfileResponseSchema,
  userResponseSchema,
  weeklyCheckinRequestSchema,
  weeklyVerdictResponseSchema,
  weightLogResponseSchema,
  workoutLogResponseSchema,
  workoutEnergyPhaseSchema,
  workoutResponseSchema,
  leanientFocusAreaSchema,
  type ApiResponse,
  type AppleSignInRequest,
  type AuthResponse,
  type CreateDoseLogRequest,
  type CreateMealLogRequest,
  type CreateMeasurementLogRequest,
  type CreateSideEffectLogRequest,
  type CreateWeightLogRequest,
  type CreateWorkoutLogRequest,
  type DoseLog,
  type LeanientFocusArea,
  type LatestWeeklyVerdictResponse,
  type MealLog,
  type MealScanRequest,
  type MealScanResponse,
  type MeasurementLog,
  type ProgressOverviewResponse,
  type SideEffectLog,
  type StallDiagnosticResponse,
  type MedicationCatalogItem,
  type OnboardingCompleteRequest,
  type OnboardingCompleteResponse,
  type PatchMeRequest,
  type PatchUserMedicationProtocolRequest,
  type PatchUserProfileRequest,
  type ProgressPhoto,
  type ProgressPhotoConfirmRequest,
  type ProgressPhotoUploadIntentRequest,
  type TodaysFocusResponse,
  type TrainingTodayResponse,
  type User,
  type UserContextSnapshot,
  type userContextSnapshotSchema,
  type UserMedicationProtocol,
  type UserProfile,
  type WeeklyCheckinRequest,
  type WeeklyVerdict,
  type WeightLog,
  type Workout,
  type WorkoutEnergyPhase,
  type WorkoutLog,
} from "@leanient/shared";
import { z } from "zod";
import { API_BASE_URL } from "../config";
import { clearAuthStorage, getStoredAuthToken } from "./storage.service";

interface LeanientApiClientOptions {
  baseURL?: string;
  adapter?: AxiosAdapter;
  onUnauthorized?: () => void;
}

interface RecommendedWorkoutParams {
  focus?: LeanientFocusArea;
  energyPhase?: WorkoutEnergyPhase;
}

interface MealLogQuery {
  recordedAt?: string;
  from?: string;
  to?: string;
  limit?: number;
}

type WorkoutLogQuery = MealLogQuery;

type ResponseSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

function unwrapBackendData<T>(value: unknown, schema?: ResponseSchema<T>): T {
  const envelope = value as Partial<ApiResponse<unknown>>;
  const rawData = envelope.data;
  return schema ? schema.parse(rawData) : (rawData as T);
}

function isUnauthorized(error: unknown): boolean {
  const maybeHttpError = error as { response?: { status?: number } };
  return maybeHttpError.response?.status === 401;
}

type ParsedUserContextSnapshot = z.infer<typeof userContextSnapshotSchema>;

function normalizeContextSnapshot(snapshot: ParsedUserContextSnapshot): UserContextSnapshot {
  return {
    ...snapshot,
    profile: {
      ...snapshot.profile,
      equipmentAccess:
        snapshot.profile.equipmentAccess ??
        inferEquipmentAccessFromTrainingStatus(snapshot.profile.trainingStatus),
      weeklyWorkoutTarget:
        snapshot.profile.weeklyWorkoutTarget ??
        computeWeeklyWorkoutTarget(snapshot.profile.trainingStatus),
      sideEffectBaseline: snapshot.profile.sideEffectBaseline ?? [],
      timezone: snapshot.profile.timezone ?? "America/New_York",
    },
  };
}

function utcDayRangeParams(recordedAt: string): { from: string; to: string } {
  const start = new Date(recordedAt);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function mealLogQueryParams(query: MealLogQuery): Omit<MealLogQuery, "recordedAt"> {
  if (query.recordedAt) {
    return {
      ...utcDayRangeParams(query.recordedAt),
      limit: query.limit,
    };
  }

  return {
    from: query.from,
    to: query.to,
    limit: query.limit,
  };
}

const userProfileFrontendSchema = userProfileResponseSchema.transform(
  (profile): UserProfile => ({
    ...profile,
    sideEffectBaseline: profile.sideEffectBaseline ?? [],
    timezone: profile.timezone ?? "America/New_York",
  }),
);

const userMedicationProtocolFrontendSchema = userMedicationProtocolResponseSchema.transform(
  (protocol): UserMedicationProtocol => ({
    ...protocol,
    active: protocol.active ?? true,
  }),
);

const weeklyVerdictFrontendSchema = weeklyVerdictResponseSchema.transform(
  (verdict): WeeklyVerdict => ({
    ...verdict,
    inputsUsed: verdict.inputsUsed
      ? {
          ...normalizeContextSnapshot(verdict.inputsUsed),
          weight: verdict.inputsUsed.weight,
          proteinGramsPerDay: verdict.inputsUsed.proteinGramsPerDay,
          resistanceWorkoutsCompleted: verdict.inputsUsed.resistanceWorkoutsCompleted,
        }
      : undefined,
  }),
);

const latestWeeklyVerdictFrontendSchema = latestWeeklyVerdictResponseSchema.transform(
  (response): LatestWeeklyVerdictResponse => {
    if (response.status === "still_gathering") {
      return response;
    }

    return {
      ...response,
      verdict: weeklyVerdictFrontendSchema.parse(response.verdict),
    };
  },
);

// POST /weekly-checkins returns `{ checkin, verdict }`; the screen only needs the
// freshly generated verdict (for the reveal), so reduce the envelope to it.
const submitWeeklyCheckinFrontendSchema = z
  .object({ verdict: weeklyVerdictFrontendSchema })
  .transform((response): WeeklyVerdict => response.verdict);

export class LeanientApiClient {
  private readonly client: AxiosInstance;
  private readonly onUnauthorized?: () => void;

  public constructor(options: LeanientApiClientOptions = {}) {
    this.onUnauthorized = options.onUnauthorized;
    this.client = axios.create({
      baseURL: options.baseURL ?? API_BASE_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
      adapter: options.adapter,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await getStoredAuthToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (isUnauthorized(error)) {
          await clearAuthStorage();
          this.onUnauthorized?.();
        }

        throw error;
      },
    );
  }

  private async get<T>(
    url: string,
    schema?: ResponseSchema<T>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.get(url, config);
    return unwrapBackendData(response.data, schema);
  }

  private async post<T>(
    url: string,
    body?: unknown,
    schema?: ResponseSchema<T>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post(url, body, config);
    return unwrapBackendData(response.data, schema);
  }

  private async patch<T>(url: string, body: unknown, schema?: ResponseSchema<T>): Promise<T> {
    const response = await this.client.patch(url, body);
    return unwrapBackendData(response.data, schema);
  }

  private async delete(url: string): Promise<void> {
    await this.client.delete(url);
  }

  public async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const body = googleSignInRequestSchema.parse({ idToken });
    return this.post("/auth/google", body, authResponseSchema);
  }

  public async signInWithApple(body: AppleSignInRequest): Promise<AuthResponse> {
    return this.post("/auth/apple", appleSignInRequestSchema.parse(body), authResponseSchema);
  }

  public async logout(): Promise<void> {
    await this.client.post("/auth/logout");
  }

  public async getMe(): Promise<User> {
    return this.get("/me", userResponseSchema);
  }

  public async patchMe(body: PatchMeRequest): Promise<User> {
    return this.patch("/me", patchMeRequestSchema.parse(body), userResponseSchema);
  }

  public async completeOnboarding(body: OnboardingCompleteRequest): Promise<OnboardingCompleteResponse> {
    return this.post(
      "/onboarding/complete",
      onboardingCompleteRequestSchema.parse(body),
      onboardingCompleteResponseSchema,
    );
  }

  public async scanMeal(body: MealScanRequest): Promise<MealScanResponse> {
    return this.post("/meal-scans/analyze", mealScanRequestSchema.parse(body), mealScanResponseSchema);
  }

  public async getStallDiagnostic(): Promise<StallDiagnosticResponse> {
    return this.post("/diagnostics/stall", undefined, stallDiagnosticResponseSchema);
  }

  public async getProfile(): Promise<UserProfile> {
    return this.get("/me/profile", userProfileFrontendSchema);
  }

  public async patchProfile(body: PatchUserProfileRequest): Promise<UserProfile> {
    return this.patch(
      "/me/profile",
      patchUserProfileRequestSchema.parse(body),
      userProfileFrontendSchema,
    );
  }

  public async getMedicationProtocol(): Promise<UserMedicationProtocol> {
    return this.get("/me/medication", userMedicationProtocolFrontendSchema);
  }

  public async patchMedicationProtocol(
    body: PatchUserMedicationProtocolRequest,
  ): Promise<UserMedicationProtocol> {
    return this.patch(
      "/me/medication",
      patchUserMedicationProtocolRequestSchema.parse(body),
      userMedicationProtocolFrontendSchema,
    );
  }

  public async createWeightLog(body: CreateWeightLogRequest): Promise<WeightLog> {
    return this.post(
      "/weight-logs",
      createWeightLogRequestSchema.parse(body),
      weightLogResponseSchema,
    );
  }

  public async getWeightLogs(): Promise<WeightLog[]> {
    return this.get("/weight-logs", weightLogResponseSchema.array());
  }

  public async getTodaysFocus(): Promise<TodaysFocusResponse> {
    return this.get("/home/focus", todaysFocusResponseSchema);
  }

  public async getProgressOverview(): Promise<ProgressOverviewResponse> {
    return this.get("/progress/overview", progressOverviewResponseSchema);
  }

  public async getTrainingToday(): Promise<TrainingTodayResponse> {
    return this.get("/training/today", trainingTodayResponseSchema);
  }

  public async getMealLogs(query: MealLogQuery = {}): Promise<MealLog[]> {
    return this.get("/meal-logs", mealLogResponseSchema.array(), {
      params: mealLogQueryParams(query),
    });
  }

  public async getWorkoutLogs(query: WorkoutLogQuery = {}): Promise<WorkoutLog[]> {
    return this.get("/workout-logs", workoutLogResponseSchema.array(), {
      params: mealLogQueryParams(query),
    });
  }

  public async createMealLog(body: CreateMealLogRequest): Promise<MealLog> {
    return this.post("/meal-logs", createMealLogRequestSchema.parse(body), mealLogResponseSchema);
  }

  public async createWorkoutLog(body: CreateWorkoutLogRequest): Promise<WorkoutLog> {
    return this.post(
      "/workout-logs",
      createWorkoutLogRequestSchema.parse(body),
      workoutLogResponseSchema,
    );
  }

  public async createDoseLog(body: CreateDoseLogRequest): Promise<DoseLog> {
    return this.post("/dose-logs", createDoseLogRequestSchema.parse(body), doseLogResponseSchema);
  }

  public async createMeasurementLog(body: CreateMeasurementLogRequest): Promise<MeasurementLog> {
    return this.post(
      "/measurement-logs",
      createMeasurementLogRequestSchema.parse(body),
      measurementLogResponseSchema,
    );
  }

  public async createSideEffectLog(body: CreateSideEffectLogRequest): Promise<SideEffectLog> {
    return this.post(
      "/side-effect-logs",
      createSideEffectLogRequestSchema.parse(body),
      sideEffectLogResponseSchema,
    );
  }

  public async submitWeeklyCheckin(body: WeeklyCheckinRequest): Promise<WeeklyVerdict> {
    return this.post(
      "/weekly-checkins",
      weeklyCheckinRequestSchema.parse(body),
      submitWeeklyCheckinFrontendSchema,
    );
  }

  public async getLatestWeeklyVerdict(): Promise<LatestWeeklyVerdictResponse> {
    return this.get("/weekly-verdicts/latest", latestWeeklyVerdictFrontendSchema);
  }

  public async getWorkouts(): Promise<Workout[]> {
    return this.get("/workouts", workoutResponseSchema.array());
  }

  public async getRecommendedWorkouts(params: RecommendedWorkoutParams = {}): Promise<Workout[]> {
    const parsedParams = {
      focus: params.focus ? leanientFocusAreaSchema.parse(params.focus) : undefined,
      energyPhase: params.energyPhase
        ? workoutEnergyPhaseSchema.parse(params.energyPhase)
        : undefined,
    };

    return this.get("/workouts/recommended", workoutResponseSchema.array(), {
      params: parsedParams,
    });
  }

  public async getMedicationCatalog(): Promise<MedicationCatalogItem[]> {
    return this.get("/medications", medicationCatalogItemResponseSchema.array());
  }

  public async createProgressPhotoUploadIntent(
    body: ProgressPhotoUploadIntentRequest,
  ): Promise<z.infer<typeof progressPhotoUploadIntentResponseSchema>> {
    return this.post(
      "/progress-photos/upload-intent",
      progressPhotoUploadIntentRequestSchema.parse(body),
      progressPhotoUploadIntentResponseSchema,
    );
  }

  public async confirmProgressPhotoUpload(
    body: ProgressPhotoConfirmRequest,
  ): Promise<ProgressPhoto> {
    return this.post(
      "/progress-photos/confirm",
      progressPhotoConfirmRequestSchema.parse(body),
      progressPhotoResponseSchema,
    );
  }

  public async getProgressPhotos(): Promise<ProgressPhoto[]> {
    return this.get("/progress-photos", progressPhotoResponseSchema.array());
  }

  public async getProgressPhotoViewUrl(
    photoId: string,
  ): Promise<z.infer<typeof progressPhotoViewUrlResponseSchema>> {
    return this.get(`/progress-photos/${photoId}/view-url`, progressPhotoViewUrlResponseSchema);
  }

  public async deleteProgressPhoto(photoId: string): Promise<void> {
    await this.delete(`/progress-photos/${photoId}`);
  }
}

export function createLeanientApiClient(options: LeanientApiClientOptions = {}): LeanientApiClient {
  return new LeanientApiClient(options);
}

const apiService = createLeanientApiClient();

export default apiService;
