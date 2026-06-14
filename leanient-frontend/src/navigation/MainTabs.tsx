import React, { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { CreateMealLogRequest, MealScanResponse, ProgressPhotoUploadIntentRequest, Workout } from "@leanient/shared";
import { QuickActionsProvider, type QuickActions } from "../context/QuickActionsContext";
import { TabBar } from "../components/layout/TabBar";
import { QuickLogSheet } from "../components/app/QuickLogSheet";
import type { QuickLogActionKey } from "../components/app/quickLogActions";
import { MealCameraScreen } from "../screens/app/MealCameraScreen";
import { MealScanScreen } from "../screens/app/MealScanScreen";
import { MealLogScreen } from "../screens/app/MealLogScreen";
import { LogWorkoutScreen } from "../screens/app/LogWorkoutScreen";
import { DoseLogScreen } from "../screens/app/DoseLogScreen";
import { WeightLogScreen } from "../screens/app/WeightLogScreen";
import { MeasurementLogScreen } from "../screens/app/MeasurementLogScreen";
import { ProgressPhotoScreen } from "../screens/app/ProgressPhotoScreen";
import { SideEffectLogScreen } from "../screens/app/SideEffectLogScreen";
import { WorkoutPlayer } from "../components/app/WorkoutPlayer";
import { WorkoutCompleteSheet, type WorkoutFeel } from "../components/app/WorkoutCompleteSheet";
import { HomeScreen } from "../screens/app/HomeScreen";
import { TrainScreen } from "../screens/app/TrainScreen";
import { ProgressScreen } from "../screens/app/ProgressScreen";
import { ProfileScreen } from "../screens/app/ProfileScreen";
import { CoachChatScreen } from "../screens/app/CoachChatScreen";
import { SubscriptionScreen } from "../screens/app/SubscriptionScreen";
import { useLeanientData } from "../context/LeanientDataContext";
import { useAuth } from "../context/AuthContext";
import { runFaceMetricCapture } from "../screens/app/faceMetricsCapture";
import { detectFaceLandmarks } from "../screens/app/faceLandmarks";
import { saveFaceMetric } from "../screens/app/faceMetricsStore";
import { mockRecommendedWorkout } from "../mocks/workouts";
import { buildGuidedWorkoutLogDraft, deriveWorkoutComplete } from "../screens/app/workoutCompleteMetrics";
import type { CompletedWorkout } from "../screens/app/workoutSession";
import { extractApiError } from "../services/apiError";
import progressPhotoService, { pickProgressPhotoFromLibrary } from "../services/progressPhoto.service";
import { colors } from "../theme/tokens";

const Tab = createBottomTabNavigator();

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

async function blobFromUri(uri: string): Promise<Blob> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("Unable to read captured photo");
  }

  return response.blob();
}

type ProgressPhotoContentType = ProgressPhotoUploadIntentRequest["contentType"];

function buildMealLogFromScan(
  mode: "as_is" | "swap",
  result: MealScanResponse,
): CreateMealLogRequest {
  const swap = mode === "swap" ? result.coachContent?.swap : null;
  const macros = swap?.adjustedMacros ?? result.analysis;

  return {
    recordedAt: new Date().toISOString(),
    source: "photo_scan",
    photoS3Key: result.photoS3Key,
    aiScanConfidence: Math.round(result.analysis.confidence * 100),
    foodName: swap ? `${result.analysis.foodName} + ${swap.description}` : result.analysis.foodName,
    servingSize: result.analysis.servingSize,
    protein: macros.protein,
    calories: macros.calories,
    carbs: macros.carbs,
    fat: macros.fat,
    // Hydration/fiber are derived from the photo itself, so the swap's macro
    // adjustments leave them untouched.
    fiber: result.analysis.fiber,
    waterOz: result.analysis.waterOz,
    notes: swap?.description,
  };
}

/** Bottom-tab navigator with the custom TabBar + the quick-log sheet + meal camera. */
export function MainTabs() {
  const data = useLeanientData();
  const auth = useAuth();
  const guidedWorkout = data.recommendedWorkouts[0] ?? mockRecommendedWorkout;
  const [logOpen, setLogOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mealLogOpen, setMealLogOpen] = useState(false);
  const [logWorkoutOpen, setLogWorkoutOpen] = useState(false);
  const [doseOpen, setDoseOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<"body" | "face">("body");
  const [sideEffectOpen, setSideEffectOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [completedWorkout, setCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [scan, setScan] = useState<{ open: boolean; photoUri: string | null }>({ open: false, photoUri: null });

  const completionView = useMemo(
    () =>
      completedWorkout
        ? deriveWorkoutComplete({
            summary: completedWorkout,
            trainingDone: data.trainingToday?.sessionsThisWeek ?? 0,
            trainingTarget: data.trainingToday?.weeklyTarget ?? data.profile?.weeklyWorkoutTarget ?? 1,
            verdictStatus: data.latestVerdict?.status ?? "no_data",
          })
        : null,
    [completedWorkout, data.latestVerdict?.status, data.profile?.weeklyWorkoutTarget, data.trainingToday],
  );

  // The workout the player runs: an explicitly chosen one (e.g. Train's featured
  // session) or the day's recommended workout.
  const playerWorkout = activeWorkout ?? guidedWorkout;

  const quickActions = useMemo<QuickActions>(
    () => ({
      openQuickLog: () => setLogOpen(true),
      openMealScan: () => setCameraOpen(true),
      openMealLog: () => setMealLogOpen(true),
      openDoseLog: () => setDoseOpen(true),
      openProgressPhoto: () => {
        setPhotoMode("body");
        setPhotoOpen(true);
      },
      openFaceCheck: () => {
        setPhotoMode("face");
        setPhotoOpen(true);
      },
      startWorkout: (workout) => {
        setActiveWorkout(workout ?? null);
        setPlayerOpen(true);
      },
    }),
    [setLogOpen, setCameraOpen, setMealLogOpen, setDoseOpen, setPhotoOpen, setPhotoMode, setActiveWorkout, setPlayerOpen],
  );

  const showLogError = (error: unknown) => {
    Alert.alert("Couldn't save", extractApiError(error).message);
  };

  const saveAndClose = async (task: () => Promise<void>, close: () => void) => {
    try {
      await task();
      close();
    } catch (error) {
      showLogError(error);
    }
  };

  const uploadProgressPhotoFromUri = async (
    uri: string,
    contentType: ProgressPhotoContentType,
    meta?: { kind?: "body" | "face"; faceFullness?: number },
  ) => {
    const blob = await blobFromUri(uri);
    await progressPhotoService.uploadProgressPhoto({
      captureDate: todayDateOnly(),
      contentType,
      bytes: blob,
      sizeBytes: blob.size || undefined,
      kind: meta?.kind ?? "body",
      faceFullness: meta?.faceFullness,
    });
    await data.refreshProgressPhotos();
  };

  // On-device facial measurement, gated on consent. Best-effort and never
  // blocks the photo save; it stays entirely on the device.
  const captureFaceMetric = async (uri: string) => {
    const user = auth.user;
    if (!user) return;
    await runFaceMetricCapture({
      userId: user.id,
      uri,
      captureDate: todayDateOnly(),
      computedAt: new Date().toISOString(),
      consentGranted: Boolean(user.faceAnalysisConsentAt),
      detect: detectFaceLandmarks,
      persist: saveFaceMetric,
    });
  };

  const pickAndUploadProgressPhoto = async () => {
    try {
      const picked = await pickProgressPhotoFromLibrary();
      if (!picked) return;

      await uploadProgressPhotoFromUri(picked.uri, picked.contentType);
      setPhotoOpen(false);
    } catch (error) {
      showLogError(error);
    }
  };

  const handleLogSelect = (key: QuickLogActionKey) => {
    setLogOpen(false);
    if (key === "scan_meal") setCameraOpen(true);
    if (key === "coach") setCoachOpen(true);
    if (key === "meal") setMealLogOpen(true);
    if (key === "workout") setLogWorkoutOpen(true);
    if (key === "dose") setDoseOpen(true);
    if (key === "weight") setWeightOpen(true);
    if (key === "measurement") setMeasurementOpen(true);
    if (key === "photo") setPhotoOpen(true);
    if (key === "side") setSideEffectOpen(true);
  };

  const confirmWorkoutCompletion = async (feel?: WorkoutFeel) => {
    if (!completedWorkout) return;

    setCompletionSaving(true);
    setCompletionError(null);
    try {
      await data.api.createWorkoutLog(
        buildGuidedWorkoutLogDraft({
          summary: completedWorkout,
          workout: playerWorkout,
          recordedAt: new Date().toISOString(),
          feel,
        }),
      );
      await data.refreshHomeData();
      setCompletionOpen(false);
      setCompletedWorkout(null);
    } catch (error) {
      setCompletionError(extractApiError(error).message);
    } finally {
      setCompletionSaving(false);
    }
  };

  return (
    <QuickActionsProvider value={quickActions}>
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Tab.Navigator
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
        tabBar={(props) => <TabBar {...props} onQuickLog={() => setLogOpen(true)} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Train" component={TrainScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      <QuickLogSheet visible={logOpen} onClose={() => setLogOpen(false)} onSelect={handleLogSelect} />

      <MealCameraScreen
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={(uri) => {
          // Hand the captured photo to the AI meal scan; the scan screen renders it.
          setCameraOpen(false);
          setScan({ open: true, photoUri: uri });
        }}
      />

      <MealScanScreen
        visible={scan.open}
        photoUri={scan.photoUri}
        onClose={() => setScan({ open: false, photoUri: null })}
        onRetake={() => {
          // Discard this shot and reopen the camera for a new one.
          setScan({ open: false, photoUri: null });
          setCameraOpen(true);
        }}
        onLogged={(mode, result) =>
          saveAndClose(
            async () => {
              await data.api.createMealLog(buildMealLogFromScan(mode, result));
              await data.refreshHomeData();
            },
            () => setScan({ open: false, photoUri: null }),
          )
        }
      />

      <MealLogScreen
        visible={mealLogOpen}
        onClose={() => setMealLogOpen(false)}
        onSave={(draft) =>
          saveAndClose(
            async () => {
              await data.api.createMealLog(draft);
              await data.refreshHomeData();
            },
            () => setMealLogOpen(false),
          )
        }
      />

      <LogWorkoutScreen
        visible={logWorkoutOpen}
        onClose={() => setLogWorkoutOpen(false)}
        onSave={(draft) =>
          saveAndClose(
            async () => {
              await data.api.createWorkoutLog(draft);
              await data.refreshHomeData();
            },
            () => setLogWorkoutOpen(false),
          )
        }
        onStartGuided={() => {
          setLogWorkoutOpen(false);
          setPlayerOpen(true);
        }}
      />

      <DoseLogScreen
        visible={doseOpen}
        onClose={() => setDoseOpen(false)}
        onSave={async (draft) => {
          try {
            await data.api.createDoseLog(draft);
            await data.refreshHomeData();
            setDoseOpen(false);
          } catch (error) {
            showLogError(error);
            throw error;
          }
        }}
      />

      <WeightLogScreen
        visible={weightOpen}
        onClose={() => setWeightOpen(false)}
        onSave={(draft) =>
          saveAndClose(
            async () => {
              await data.api.createWeightLog(draft);
              await data.refreshHomeData();
            },
            () => setWeightOpen(false),
          )
        }
      />

      <MeasurementLogScreen
        visible={measurementOpen}
        onClose={() => setMeasurementOpen(false)}
        onSave={(draft) =>
          saveAndClose(
            async () => {
              await data.api.createMeasurementLog(draft);
            },
            () => setMeasurementOpen(false),
          )
        }
      />

      <ProgressPhotoScreen
        visible={photoOpen}
        mode={photoMode}
        onClose={() => setPhotoOpen(false)}
        onCaptured={(uri, captureMeta) =>
          saveAndClose(
            async () => {
              await uploadProgressPhotoFromUri(uri, "image/jpeg", {
                kind: captureMeta.kind,
                faceFullness: captureMeta.faceFullness,
              });
              if (captureMeta.kind === "face") {
                await captureFaceMetric(uri);
              }
            },
            () => setPhotoOpen(false),
          )
        }
        onGallery={() => void pickAndUploadProgressPhoto()}
      />

      <SideEffectLogScreen
        visible={sideEffectOpen}
        onClose={() => setSideEffectOpen(false)}
        onSave={(draft) =>
          saveAndClose(
            async () => {
              await data.api.createSideEffectLog(draft);
            },
            () => setSideEffectOpen(false),
          )
        }
      />

      <CoachChatScreen
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        onUpgrade={() => {
          setCoachOpen(false);
          setSubscriptionOpen(true);
        }}
      />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />

      <WorkoutPlayer
        visible={playerOpen}
        workout={playerWorkout}
        onClose={() => setPlayerOpen(false)}
        onComplete={(summary) => {
          setPlayerOpen(false);
          setCompletedWorkout(summary);
          setCompletionOpen(true);
        }}
      />

      {completionView ? (
        <WorkoutCompleteSheet
          visible={completionOpen}
          view={completionView}
          onClose={() => {
            setCompletionOpen(false);
            setCompletionError(null);
          }}
          onBackHome={(feel) => void confirmWorkoutCompletion(feel)}
          isSaving={completionSaving}
          errorMessage={completionError}
        />
      ) : null}
    </View>
    </QuickActionsProvider>
  );
}

export default MainTabs;
