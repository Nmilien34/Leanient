import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { Workout, WorkoutEnergyPhase, WorkoutLog } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { UserAvatar } from "../../components/app/UserAvatar";
import { WorkoutCard } from "../../components/app/WorkoutCard";
import { WorkoutDetailSheet } from "../../components/app/WorkoutDetailSheet";
import { WorkoutPlayer } from "../../components/app/WorkoutPlayer";
import { WorkoutCompleteSheet } from "../../components/app/WorkoutCompleteSheet";
import { WorkoutHistoryScreen } from "./WorkoutHistoryScreen";
import { WorkoutDetailScreen } from "./WorkoutDetailScreen";
import { SkeletonCard } from "../../components/app/LoadingSkeleton";
import { ErrorState } from "../../components/app/ErrorState";
import { EmptyState } from "../../components/app/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { resolveSectionState } from "./sectionState";
import { buildGuidedWorkoutLogDraft, deriveWorkoutComplete } from "./workoutCompleteMetrics";
import type { CompletedWorkout } from "./workoutSession";
import { extractApiError } from "../../services/apiError";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ENERGY_LABEL: Record<WorkoutEnergyPhase, string> = {
  shot_day: "SHOT DAY",
  low_energy: "LOW ENERGY",
  steady_energy: "STEADY ENERGY",
  high_energy: "HIGH ENERGY",
};

export function TrainScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const { startWorkout } = useQuickActions();
  const navigation = useNavigation();
  const refreshedForUserRef = useRef<string | null>(null);
  const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [completed, setCompleted] = useState<CompletedWorkout | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);

  const trainingToday = data.trainingToday;
  const featured = trainingToday?.featuredWorkout?.workout ?? null;
  const library = data.workouts;
  const done = trainingToday?.sessionsThisWeek ?? 0;
  const target = trainingToday?.weeklyTarget ?? 0;
  const completeView = useMemo(
    () =>
      completed
        ? deriveWorkoutComplete({
            summary: completed,
            trainingDone: done,
            trainingTarget: target,
            verdictStatus: data.latestVerdict?.status ?? "no_data",
          })
        : null,
    [completed, data.latestVerdict?.status, done, target],
  );

  // Train refreshes the library and today's composite together on mount.
  const todayState = resolveSectionState({
    hasData: !!featured,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!data.workoutsError,
  });
  const libraryState = resolveSectionState({
    hasData: library.length > 0,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!data.workoutsError,
  });

  useEffect(() => {
    const userId = auth.user?.id;

    if (!userId || refreshedForUserRef.current === userId) {
      return;
    }

    refreshedForUserRef.current = userId;
    void data.refreshWorkouts();
  }, [auth.user?.id, data.refreshWorkouts]);

  const startLibraryWorkout = (workout: Workout) => {
    if (!workout.exercises.length) {
      return;
    }

    setDetailWorkout(null);
    setActiveWorkout(workout);
  };

  const confirmWorkoutComplete = async () => {
    if (!completed || !activeWorkout) return;

    setCompleteSaving(true);
    setCompleteError(null);
    try {
      await data.api.createWorkoutLog(
        buildGuidedWorkoutLogDraft({
          summary: completed,
          workout: activeWorkout,
          recordedAt: new Date().toISOString(),
        }),
      );
      await data.refreshHomeData();
      await data.refreshWorkouts();
      setCompleteOpen(false);
      setCompleted(null);
      setActiveWorkout(null);
    } catch (error) {
      setCompleteError(extractApiError(error).message);
    } finally {
      setCompleteSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* section head */}
          <View style={styles.secthead}>
            <View>
              <Text style={styles.stitle}>Train</Text>
              <Text style={styles.ssub}>
                {trainingToday ? `${done} of ${target} sessions this week` : "Getting your week ready"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              hitSlop={8}
              onPress={() => navigation.navigate("Profile" as never)}
            >
              <UserAvatar />
            </Pressable>
          </View>

          {/* today's session */}
          {todayState === "loading" ? (
            <SkeletonCard lines={4} />
          ) : todayState === "error" ? (
            <ErrorState onRetry={() => void data.refreshWorkouts()} />
          ) : todayState === "empty" || !featured ? (
            <EmptyState title="No session planned today" message="Browse your library below to pick one." />
          ) : (
            <View style={styles.todayCard}>
              <Text style={styles.todayEyebrow}>TODAY · {ENERGY_LABEL[featured.energyPhase]}</Text>
              <Text style={styles.todayTitle}>
                {featured.title} · {featured.durationMinutes} min
              </Text>
              <Text style={styles.todaySub}>{featured.shortDescription}</Text>
              <View style={styles.tags}>
                {featured.tags.map((t) => (
                  <View key={t} style={styles.tagp}>
                    <Text style={styles.tagpText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Start workout" onPress={() => startWorkout(featured ?? undefined)}>
                <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.startBtn}>
                  <Text style={styles.startText}>Start workout</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* library */}
          <View style={styles.libHead}>
            <Text style={styles.libTitle}>Your library</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Workout history" hitSlop={8} onPress={() => setHistoryOpen(true)}>
              <Text style={styles.libLink}>History ›</Text>
            </Pressable>
          </View>
          {libraryState === "loading" ? (
            <SkeletonCard lines={3} />
          ) : libraryState === "error" ? (
            <ErrorState onRetry={() => void data.refreshWorkouts()} />
          ) : libraryState === "empty" ? (
            <EmptyState message="Your workouts will appear here." />
          ) : (
            <View style={styles.wlist}>
              {library.map((wk) => (
                <WorkoutCard key={wk.id} workout={wk} onPress={() => setDetailWorkout(wk)} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <WorkoutDetailSheet
        visible={Boolean(detailWorkout)}
        workout={detailWorkout}
        onClose={() => setDetailWorkout(null)}
        onStartWorkout={startLibraryWorkout}
      />
      {activeWorkout ? (
        <WorkoutPlayer
          visible={Boolean(activeWorkout) && !completeOpen && !completed}
          workout={activeWorkout}
          onClose={() => setActiveWorkout(null)}
          onComplete={(summary) => {
            setCompleted(summary);
            setCompleteOpen(true);
          }}
        />
      ) : null}
      {completeView ? (
        <WorkoutCompleteSheet
          visible={completeOpen}
          view={completeView}
          onClose={() => {
            setCompleteOpen(false);
            setCompleteError(null);
            setCompleted(null);
            setActiveWorkout(null);
          }}
          onBackHome={() => void confirmWorkoutComplete()}
          isSaving={completeSaving}
          errorMessage={completeError}
        />
      ) : null}

      <WorkoutHistoryScreen
        visible={historyOpen}
        workouts={library}
        onClose={() => setHistoryOpen(false)}
        onSelectLog={(log) => setSelectedLog(log)}
      />
      <WorkoutDetailScreen
        visible={selectedLog !== null}
        log={selectedLog}
        workouts={library}
        onClose={() => setSelectedLog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 120 },
  secthead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  stitle: { fontFamily: font.extrabold, fontSize: 27, letterSpacing: -0.81, color: colors.ink },
  ssub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.bold, fontSize: 13, color: "#5B6157" },
  // today's session
  todayCard: { marginHorizontal: 20, marginTop: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  todayEyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.amberDeep },
  todayTitle: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.44, color: colors.ink, marginTop: 8 },
  todaySub: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 18, color: colors.muted, marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tagp: { backgroundColor: "rgba(47,184,122,0.10)", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9 },
  tagpText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.emeraldDeep },
  startBtn: { marginTop: 16, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  startText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7" },
  // library
  libHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  libTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  libLink: { fontFamily: font.semibold, fontSize: 13.5, color: colors.emeraldDeep },
  wlist: { gap: 10, paddingHorizontal: 20, paddingTop: 6 },
});

export default TrainScreen;
