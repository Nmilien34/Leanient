import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type {
  ApiError,
  CreateDoseLogRequest,
  CreateMealLogRequest,
  CreateMeasurementLogRequest,
  CreateSideEffectLogRequest,
  CreateWeightLogRequest,
  CreateWorkoutLogRequest,
  DoseLog,
  LatestWeeklyVerdictResponse,
  MealLog,
  MedicationCatalogItem,
  MeasurementLog,
  ProgressPhoto,
  ProgressPhotoConfirmRequest,
  ProgressPhotoUploadIntentRequest,
  ProgressOverviewResponse,
  SideEffectLog,
  TodaysFocusResponse,
  TrainingTodayResponse,
  UserMedicationProtocol,
  UserProfile,
  WeeklyVerdict,
  WeightLog,
  Workout,
  WorkoutLog,
} from "@leanient/shared";
import apiService from "../services/api.service";
import { extractApiError } from "../services/apiError";
import { weekRange } from "../screens/app/weeklyCheckin";
import { useAuth } from "./AuthContext";

export interface LeanientDataApi {
  getProfile(): Promise<UserProfile>;
  getMedicationProtocol(): Promise<UserMedicationProtocol>;
  getMedicationCatalog(): Promise<MedicationCatalogItem[]>;
  getWeightLogs(): Promise<WeightLog[]>;
  getLatestWeeklyVerdict(): Promise<LatestWeeklyVerdictResponse>;
  getWorkouts(): Promise<Workout[]>;
  getRecommendedWorkouts(): Promise<Workout[]>;
  getProgressPhotos(): Promise<ProgressPhoto[]>;
  getTodaysFocus(): Promise<TodaysFocusResponse>;
  getProgressOverview(): Promise<ProgressOverviewResponse>;
  getTrainingToday(): Promise<TrainingTodayResponse>;
  getMealLogs(query?: { recordedAt?: string; from?: string; to?: string }): Promise<MealLog[]>;
  getWorkoutLogs(query?: { recordedAt?: string }): Promise<WorkoutLog[]>;
  getDoseLogs(query?: { recordedAt?: string; from?: string; to?: string; limit?: number }): Promise<DoseLog[]>;
  createWeightLog(input: CreateWeightLogRequest): Promise<WeightLog>;
  createMealLog(input: CreateMealLogRequest): Promise<MealLog>;
  createWorkoutLog(input: CreateWorkoutLogRequest): Promise<WorkoutLog>;
  createDoseLog(input: CreateDoseLogRequest): Promise<DoseLog>;
  createMeasurementLog(input: CreateMeasurementLogRequest): Promise<MeasurementLog>;
  createSideEffectLog(input: CreateSideEffectLogRequest): Promise<SideEffectLog>;
  createProgressPhotoUploadIntent(input: ProgressPhotoUploadIntentRequest): Promise<{
    photo: ProgressPhoto;
    uploadUrl: string;
    expiresAt: string;
  }>;
  confirmProgressPhotoUpload(input: ProgressPhotoConfirmRequest): Promise<ProgressPhoto>;
}

export interface LeanientDataContextValue {
  api: LeanientDataApi;
  profile: UserProfile | null;
  medicationProtocol: UserMedicationProtocol | null;
  medicationCatalog: MedicationCatalogItem[];
  weightLogs: WeightLog[];
  latestVerdictStatus: LatestWeeklyVerdictResponse["status"] | null;
  latestVerdict: WeeklyVerdict | null;
  latestVerdictMessage: string | null;
  todaysFocus: TodaysFocusResponse | null;
  todaysMeals: MealLog[];
  /** Meal logs for the week `now` falls in; feeds the weekly protein ring. */
  weekMeals: MealLog[];
  todaysWorkouts: WorkoutLog[];
  recentDoseLogs: DoseLog[];
  progressOverview: ProgressOverviewResponse | null;
  trainingToday: TrainingTodayResponse | null;
  workouts: Workout[];
  recommendedWorkouts: Workout[];
  progressPhotos: ProgressPhoto[];
  isLoading: boolean;
  isRefreshing: boolean;
  /** Last failure of the combined home fetch, cleared on the next attempt/success. */
  homeError: ApiError | null;
  /** Last failure while refreshing Train-tab workout data. */
  workoutsError: ApiError | null;
  /** Last failure while refreshing Progress-tab data. */
  progressPhotosError: ApiError | null;
  refreshHomeData(): Promise<void>;
  refreshOnboardingData(): Promise<void>;
  refreshWorkouts(): Promise<void>;
  refreshProgress(): Promise<void>;
  refreshProgressPhotos(): Promise<void>;
  refreshMedicationCatalog(): Promise<void>;
}

interface LeanientDataProviderProps {
  children: ReactNode;
  api?: LeanientDataApi;
  isAuthenticated?: boolean;
}

interface RunOnceOptions {
  queueIfInFlight?: boolean;
}

const LeanientDataContext = createContext<LeanientDataContextValue | undefined>(undefined);

/**
 * Run a fetch, and on failure retry it once after a short pause. The first
 * home fetch after onboarding triggers first-ever content generation on the
 * backend (today's focus, training copy), which can push a response past the
 * client timeout on slow networks; by the retry the content is cached and
 * fast, so the user never sees a transient failure.
 */
async function retryOnce<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return task();
  }
}

export function LeanientDataProvider({
  children,
  api = apiService,
  isAuthenticated: isAuthenticatedOverride,
}: LeanientDataProviderProps) {
  const auth = useOptionalAuth();
  const isAuthenticated = isAuthenticatedOverride ?? auth?.isAuthenticated ?? false;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [medicationProtocol, setMedicationProtocol] = useState<UserMedicationProtocol | null>(null);
  const [medicationCatalog, setMedicationCatalog] = useState<MedicationCatalogItem[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [latestVerdictStatus, setLatestVerdictStatus] = useState<
    LatestWeeklyVerdictResponse["status"] | null
  >(null);
  const [latestVerdict, setLatestVerdict] = useState<WeeklyVerdict | null>(null);
  const [latestVerdictMessage, setLatestVerdictMessage] = useState<string | null>(null);
  const [todaysFocus, setTodaysFocus] = useState<TodaysFocusResponse | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<MealLog[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealLog[]>([]);
  const [todaysWorkouts, setTodaysWorkouts] = useState<WorkoutLog[]>([]);
  const [recentDoseLogs, setRecentDoseLogs] = useState<DoseLog[]>([]);
  const [progressOverview, setProgressOverview] = useState<ProgressOverviewResponse | null>(null);
  const [trainingToday, setTrainingToday] = useState<TrainingTodayResponse | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [recommendedWorkouts, setRecommendedWorkouts] = useState<Workout[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [homeError, setHomeError] = useState<ApiError | null>(null);
  const [workoutsError, setWorkoutsError] = useState<ApiError | null>(null);
  const [progressPhotosError, setProgressPhotosError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const queuedRefreshRef = useRef<Set<string>>(new Set());

  const runOnce = useCallback(
    async (key: string, task: () => Promise<void>, options: RunOnceOptions = {}): Promise<void> => {
      const inFlight = inFlightRef.current.get(key);
      if (inFlight) {
        if (options.queueIfInFlight) {
          queuedRefreshRef.current.add(key);
          await inFlight;
        }

        return;
      }

      setIsRefreshing(true);

      const taskPromise = (async () => {
        do {
          queuedRefreshRef.current.delete(key);
          await task();
        } while (queuedRefreshRef.current.has(key));
      })();

      inFlightRef.current.set(key, taskPromise);

      try {
        await taskPromise;
      } finally {
        inFlightRef.current.delete(key);
        setIsRefreshing(inFlightRef.current.size > 0);
        setIsLoading(false);
      }
    },
    [],
  );

  const loadProgressData = useCallback(async () => {
    setProgressPhotosError(null);
    const [nextProgressOverview, nextWeights, nextPhotos] = await Promise.allSettled([
      api.getProgressOverview(),
      api.getWeightLogs(),
      api.getProgressPhotos(),
    ]);

    const firstRejected = [nextProgressOverview, nextWeights, nextPhotos].find(
      (result) => result.status === "rejected",
    );
    if (firstRejected?.status === "rejected") {
      setProgressPhotosError(extractApiError(firstRejected.reason));
    }

    if (nextProgressOverview.status === "fulfilled") setProgressOverview(nextProgressOverview.value);
    if (nextWeights.status === "fulfilled") setWeightLogs(nextWeights.value);
    if (nextPhotos.status === "fulfilled") setProgressPhotos(nextPhotos.value);
  }, [api]);

  const refreshHomeData = useCallback(
    async () =>
      runOnce("home", async () => {
        setIsLoading(true);
        setHomeError(null);
        const now = new Date();
        const today = now.toISOString();
        const [
          nextProfile,
          nextProtocol,
          nextWeights,
          nextVerdict,
          nextRecommended,
          nextFocus,
          nextMeals,
          nextWeekMeals,
          nextWorkouts,
          nextDoses,
          nextProgressOverview,
          nextTrainingToday,
        ] = await Promise.allSettled([
          retryOnce(() => api.getProfile()),
          retryOnce(() => api.getMedicationProtocol()),
          retryOnce(() => api.getWeightLogs()),
          retryOnce(() => api.getLatestWeeklyVerdict()),
          retryOnce(() => api.getRecommendedWorkouts()),
          retryOnce(() => api.getTodaysFocus()),
          retryOnce(() => api.getMealLogs({ recordedAt: today })),
          retryOnce(() => api.getMealLogs(weekRange(now))),
          retryOnce(() => api.getWorkoutLogs({ recordedAt: today })),
          retryOnce(() => api.getDoseLogs()),
          retryOnce(() => api.getProgressOverview()),
          retryOnce(() => api.getTrainingToday()),
        ]);

        const firstRejected = [
          nextProfile,
          nextProtocol,
          nextWeights,
          nextVerdict,
          nextRecommended,
          nextFocus,
          nextMeals,
          nextWeekMeals,
          nextWorkouts,
          nextDoses,
          nextProgressOverview,
          nextTrainingToday,
        ].find((result) => result.status === "rejected");
        if (firstRejected?.status === "rejected") {
          setHomeError(extractApiError(firstRejected.reason));
        }

        if (nextProfile.status === "fulfilled") setProfile(nextProfile.value);
        if (nextProtocol.status === "fulfilled") setMedicationProtocol(nextProtocol.value);
        if (nextWeights.status === "fulfilled") setWeightLogs(nextWeights.value);
        if (nextVerdict.status === "fulfilled") {
          setLatestVerdictStatus(nextVerdict.value.status);
          setLatestVerdict(nextVerdict.value.verdict);
          setLatestVerdictMessage(nextVerdict.value.message);
        }
        if (nextRecommended.status === "fulfilled") setRecommendedWorkouts(nextRecommended.value);
        if (nextFocus.status === "fulfilled") setTodaysFocus(nextFocus.value);
        if (nextMeals.status === "fulfilled") setTodaysMeals(nextMeals.value);
        if (nextWeekMeals.status === "fulfilled") setWeekMeals(nextWeekMeals.value);
        if (nextWorkouts.status === "fulfilled") setTodaysWorkouts(nextWorkouts.value);
        if (nextDoses.status === "fulfilled") setRecentDoseLogs(nextDoses.value);
        if (nextProgressOverview.status === "fulfilled") setProgressOverview(nextProgressOverview.value);
        if (nextTrainingToday.status === "fulfilled") setTrainingToday(nextTrainingToday.value);
      }),
    [api, runOnce],
  );

  const refreshOnboardingData = useCallback(
    async () =>
      runOnce("onboarding", async () => {
        setIsLoading(true);
        const [nextProfile, nextProtocol, nextCatalog, nextWeights] = await Promise.all([
          api.getProfile(),
          api.getMedicationProtocol(),
          api.getMedicationCatalog(),
          api.getWeightLogs(),
        ]);

        setProfile(nextProfile);
        setMedicationProtocol(nextProtocol);
        setMedicationCatalog(nextCatalog);
        setWeightLogs(nextWeights);
      }),
    [api, runOnce],
  );

  const refreshWorkouts = useCallback(
    async () =>
      runOnce("workouts", async () => {
        setWorkoutsError(null);
        const [nextWorkouts, nextRecommended, nextTrainingToday] = await Promise.allSettled([
          api.getWorkouts(),
          api.getRecommendedWorkouts(),
          api.getTrainingToday(),
        ]);

        const firstRejected = [nextWorkouts, nextRecommended, nextTrainingToday].find(
          (result) => result.status === "rejected",
        );
        if (firstRejected?.status === "rejected") {
          setWorkoutsError(extractApiError(firstRejected.reason));
        }

        if (nextWorkouts.status === "fulfilled") setWorkouts(nextWorkouts.value);
        if (nextRecommended.status === "fulfilled") setRecommendedWorkouts(nextRecommended.value);
        if (nextTrainingToday.status === "fulfilled") setTrainingToday(nextTrainingToday.value);
      }),
    [api, runOnce],
  );

  const refreshProgress = useCallback(
    async () => runOnce("progress", loadProgressData),
    [loadProgressData, runOnce],
  );

  const refreshProgressPhotos = useCallback(
    async () => runOnce("progress", loadProgressData, { queueIfInFlight: true }),
    [loadProgressData, runOnce],
  );

  const refreshMedicationCatalog = useCallback(
    async () =>
      runOnce("medicationCatalog", async () => {
        setMedicationCatalog(await api.getMedicationCatalog());
      }),
    [api, runOnce],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      // Only refresh for users already in the app (profile loaded). Refreshing
      // mid-onboarding flips isRefreshing, which makes App.tsx flash the splash
      // on every foreground, and there is no home data to load yet anyway.
      if (state === "active" && isAuthenticated && profile) {
        void refreshHomeData();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, profile, refreshHomeData]);

  const value = useMemo<LeanientDataContextValue>(
    () => ({
      api,
      profile,
      medicationProtocol,
      medicationCatalog,
      weightLogs,
      latestVerdictStatus,
      latestVerdict,
      latestVerdictMessage,
      todaysFocus,
      todaysMeals,
      weekMeals,
      todaysWorkouts,
      recentDoseLogs,
      progressOverview,
      trainingToday,
      workouts,
      recommendedWorkouts,
      progressPhotos,
      isLoading,
      isRefreshing,
      homeError,
      workoutsError,
      progressPhotosError,
      refreshHomeData,
      refreshOnboardingData,
      refreshWorkouts,
      refreshProgress,
      refreshProgressPhotos,
      refreshMedicationCatalog,
    }),
    [
      api,
      homeError,
      isLoading,
      isRefreshing,
      latestVerdictMessage,
      latestVerdictStatus,
      latestVerdict,
      medicationCatalog,
      medicationProtocol,
      profile,
      progressPhotosError,
      progressOverview,
      progressPhotos,
      recentDoseLogs,
      recommendedWorkouts,
      refreshProgress,
      refreshHomeData,
      refreshMedicationCatalog,
      refreshOnboardingData,
      refreshProgressPhotos,
      refreshWorkouts,
      todaysFocus,
      todaysMeals,
      weekMeals,
      todaysWorkouts,
      trainingToday,
      weightLogs,
      workoutsError,
      workouts,
    ],
  );

  return <LeanientDataContext.Provider value={value}>{children}</LeanientDataContext.Provider>;
}

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return undefined;
  }
}

export function useLeanientData(): LeanientDataContextValue {
  const context = useContext(LeanientDataContext);

  if (!context) {
    throw new Error("useLeanientData must be used within a LeanientDataProvider");
  }

  return context;
}
