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
  mealLogScanDetailResponseSchema,
  coachChatRequestSchema,
  coachChatResponseSchema,
  mealScanRequestSchema,
  mealScanResponseSchema,
  measurementLogResponseSchema,
  stallDiagnosticResponseSchema,
  medicationCatalogItemResponseSchema,
  onboardingCompleteRequestSchema,
  onboardingCompleteResponseSchema,
  avatarConfirmRequestSchema,
  avatarUploadIntentRequestSchema,
  avatarUploadIntentResponseSchema,
  avatarViewUrlResponseSchema,
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
  verdictSourceSchema,
  verdictStatusSchema,
  weeklyCheckinRequestSchema,
  weeklyVerdictResponseSchema,
  weeklyCheckinResponseSchema,
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
  type MealLogScanDetailResponse,
  type MealScanRequest,
  type MealScanResponse,
  type MeasurementLog,
  type ProgressOverviewResponse,
  type SideEffectLog,
  type StallDiagnosticResponse,
  type CoachChatMessage,
  type CoachChatResponse,
  type MedicationCatalogItem,
  type OnboardingCompleteRequest,
  type OnboardingCompleteResponse,
  type AvatarConfirmRequest,
  type AvatarUploadIntentRequest,
  type AvatarUploadIntentResponse,
  type AvatarViewUrlResponse,
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
  type VerdictStatus,
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
type DoseLogQuery = MealLogQuery;

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

/**
 * A 403 from a gated endpoint (e.g. the coach) means the user is authenticated
 * but lacks an active subscription. Callers use this to show a paywall instead
 * of a generic error.
 */
export function isSubscriptionRequired(error: unknown): boolean {
  const maybeHttpError = error as { response?: { status?: number } };
  return maybeHttpError.response?.status === 403;
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

// Check-in history: raw check-in + the verdict run through the same normalizer
// used elsewhere so verdicts match the frontend WeeklyVerdict shape.
const checkinHistoryFrontendSchema = z.array(
  z.object({
    checkin: weeklyCheckinResponseSchema,
    verdict: weeklyVerdictFrontendSchema.nullable(),
  }),
);

/** A check-in paired with its (normalized) verdict, as returned to the app. */
export type CheckinHistoryItem = z.infer<typeof checkinHistoryFrontendSchema>[number];

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

const submitWeeklyVerdictStatusSchema = z
  .union([verdictStatusSchema, z.literal("needs_reset")])
  .transform((status): VerdictStatus => (status === "needs_reset" ? "losing_muscle" : status));

const submitWeeklyVerdictFallbackSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    weekOf: z.string().min(1),
    checkinId: z.string().min(1).nullable(),
    source: verdictSourceSchema,
    engineVersion: z.string().min(1),
    copyVersion: z.string().min(1).nullable(),
    explanation: z.string().min(1).nullable(),
    status: submitWeeklyVerdictStatusSchema,
    score: z.number().min(0).max(100).nullable(),
    estimatedLeanMassRisk: z.number().min(0).max(1).nullable(),
    nextActionCode: z.string().min(1),
    headline: z.string().min(1),
    message: z.string().min(1),
    explanationFactors: z.array(z.string().min(1)).default([]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    inputsUsed: z.unknown().optional(),
  })
  .transform((verdict): WeeklyVerdict => {
    const { inputsUsed: _inputsUsed, ...cardVerdict } = verdict;
    return cardVerdict;
  });

// POST /weekly-checkins returns `{ checkin, verdict }`; the screen only needs the
// freshly generated verdict card for the reveal. Try the full contract first,
// then tolerate nested snapshot drift so a saved check-in does not look failed.
const submitWeeklyCheckinFrontendSchema = z
  .object({ verdict: z.unknown() })
  .transform((response): WeeklyVerdict => {
    const strictVerdict = weeklyVerdictFrontendSchema.safeParse(response.verdict);
    return strictVerdict.success
      ? strictVerdict.data
      : submitWeeklyVerdictFallbackSchema.parse(response.verdict);
  });

export class LeanientApiClient {
  private readonly client: AxiosInstance;
  private onUnauthorized?: () => void;

  /**
   * Registers the app-level reaction to a 401 (session invalid/expired). The
   * interceptor already clears stored credentials; this lets AuthContext also
   * flip the in-memory state to signed out so the UI returns to sign-in
   * instead of carrying a ghost session until the next cold start.
   */
  public setUnauthorizedHandler(handler: (() => void) | undefined): void {
    this.onUnauthorized = handler;
  }

  public constructor(options: LeanientApiClientOptions = {}) {
    this.onUnauthorized = options.onUnauthorized;
    this.client = axios.create({
      baseURL: options.baseURL ?? API_BASE_URL,
      // First-ever fetches of generated content (today's focus, training copy)
      // can take ~8s server-side (OpenAI budgets) plus network; 10s left no
      // headroom and timed out fresh users right after onboarding.
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
      adapter: options.adapter,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await getStoredAuthToken();

      config.headers.set?.("Cache-Control", "no-store");
      config.headers.set?.("Pragma", "no-cache");
      config.headers["Cache-Control"] = "no-store";
      config.headers.Pragma = "no-cache";
      config.headers.delete?.("If-None-Match");
      config.headers.delete?.("If-Modified-Since");
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];

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

  public async linkAppleProvider(body: AppleSignInRequest): Promise<User> {
    return this.post("/auth/apple/link", appleSignInRequestSchema.parse(body), userResponseSchema);
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

  public async createAvatarUploadIntent(
    body: AvatarUploadIntentRequest,
  ): Promise<AvatarUploadIntentResponse> {
    return this.post(
      "/me/avatar/upload-intent",
      avatarUploadIntentRequestSchema.parse(body),
      avatarUploadIntentResponseSchema,
    );
  }

  public async confirmAvatarUpload(body: AvatarConfirmRequest): Promise<User> {
    return this.post("/me/avatar", avatarConfirmRequestSchema.parse(body), userResponseSchema);
  }

  public async getAvatarViewUrl(): Promise<AvatarViewUrlResponse> {
    return this.get("/me/avatar/view-url", avatarViewUrlResponseSchema);
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

  public async getMealLogScan(mealLogId: string): Promise<MealLogScanDetailResponse> {
    return this.get(`/meal-logs/${mealLogId}/scan`, mealLogScanDetailResponseSchema);
  }

  public async getStallDiagnostic(): Promise<StallDiagnosticResponse> {
    return this.post("/diagnostics/stall", undefined, stallDiagnosticResponseSchema);
  }

  public async coachChat(messages: CoachChatMessage[]): Promise<CoachChatResponse> {
    return this.post(
      "/coach/chat",
      coachChatRequestSchema.parse({ messages }),
      coachChatResponseSchema,
    );
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

  public async getDoseLogs(query: DoseLogQuery = {}): Promise<DoseLog[]> {
    return this.get("/dose-logs", doseLogResponseSchema.array(), {
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

  public async getCheckinHistory(): Promise<CheckinHistoryItem[]> {
    return this.get("/weekly-checkins", checkinHistoryFrontendSchema);
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
