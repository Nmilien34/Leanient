import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { MuscleRetentionLabel, SubscriptionStatus, WorkoutLog } from "@leanient/shared";
import type { CheckinHistoryItem } from "../../services/api.service";
import { useNavigation } from "@react-navigation/native";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { UserAvatar } from "../../components/app/UserAvatar";
import { LineChart } from "../../components/app/LineChart";
import { AddPhotoThumb, ProgressPhotoThumb } from "../../components/app/ProgressPhotoThumb";
import { SkeletonCard } from "../../components/app/LoadingSkeleton";
import { ErrorState } from "../../components/app/ErrorState";
import { EmptyState } from "../../components/app/EmptyState";
import { CoachChatScreen } from "./CoachChatScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { CheckinHistoryScreen } from "./CheckinHistoryScreen";
import { CheckinDetailScreen } from "./CheckinDetailScreen";
import { WorkoutHistoryScreen } from "./WorkoutHistoryScreen";
import { WorkoutDetailScreen } from "./WorkoutDetailScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { resolveSectionState } from "./sectionState";
import {
  buildProgressRetentionChart,
  buildProgressWeightChart,
  buildWorkoutSessionsCard,
} from "./progressMetrics";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RETENTION_COLOR: Record<MuscleRetentionLabel, string> = {
  keeping_muscle: colors.emerald,
  maintaining: colors.emerald,
  losing_some: colors.amber,
  losing_muscle: colors.slate,
};
const RETENTION_TEXT: Record<MuscleRetentionLabel, string> = {
  keeping_muscle: "Keeping muscle",
  maintaining: "Maintaining",
  losing_some: "Losing some",
  losing_muscle: "Losing muscle",
};

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86_400_000));
}

function Spark() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

export function ProgressScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const { openProgressPhoto } = useQuickActions();
  const navigation = useNavigation();
  const refreshedForUserRef = useRef<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [checkinHistoryOpen, setCheckinHistoryOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinHistoryItem | null>(null);
  const [workoutHistoryOpen, setWorkoutHistoryOpen] = useState(false);
  const [selectedWorkoutLog, setSelectedWorkoutLog] = useState<WorkoutLog | null>(null);
  const now = new Date();

  const SUBSCRIBED: SubscriptionStatus[] = ["trialing", "active", "active_canceled"];
  const subscribed = auth.user ? SUBSCRIBED.includes(auth.user.subscriptionStatus) : false;
  const openCoach = () => (subscribed ? setCoachOpen(true) : setSubscriptionOpen(true));

  const overview = data.progressOverview;
  const profile = data.profile;
  const medication = data.medicationProtocol;
  const weightLogs = data.weightLogs;

  useEffect(() => {
    const userId = auth.user?.id;

    if (!userId || refreshedForUserRef.current === userId) {
      return;
    }

    refreshedForUserRef.current = userId;
    void data.refreshProgress();
    // Re-fetch the user so subscription status is current. The cached user from
    // login can be stale (e.g. after a subscription starts), which would wrongly
    // gate the coach. refreshMe() pulls the authoritative status from the server.
    void auth.refreshMe();
  }, [auth.user?.id, auth.refreshMe, data.refreshProgress]);

  // Header
  const weeksOnMed =
    overview?.summary.weeksOnProtocol ??
    (medication ? Math.max(1, Math.floor(daysSince(medication.startDate, now) / 7)) : null);
  const medName = overview?.summary.medicationName ?? medication?.medicationName ?? null;

  // Section data + states (retention + weight come from the combined home fetch).
  const snapshots = overview?.chart.snapshots ?? [];
  const retentionChart = useMemo(
    () => buildProgressRetentionChart(snapshots, (label) => RETENTION_COLOR[label]),
    [snapshots],
  );
  const weightChart = useMemo(
    () =>
      buildProgressWeightChart({
        weightLogs,
        fallbackUnit: profile?.goalWeightUnit ?? "lb",
        goalWeight: profile?.goalWeight,
      }),
    [profile?.goalWeight, profile?.goalWeightUnit, weightLogs],
  );
  const retentionState = resolveSectionState({
    hasData: retentionChart.snapshots.length > 0,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!(data.progressPhotosError ?? data.homeError),
  });
  const weightState = resolveSectionState({
    hasData: weightLogs.length > 0 && !!profile,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!(data.progressPhotosError ?? data.homeError),
  });
  const photos = data.progressPhotos.slice().sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1));
  const photosState = resolveSectionState({
    hasData: photos.length > 0,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!data.progressPhotosError,
  });

  const { points: weightPoints, unit, startWeight, todayWeight, lost } = weightChart;
  const { points: retentionPoints } = retentionChart;
  const workoutSessionsCard = buildWorkoutSessionsCard(data.trainingToday);

  const weekOf = (captureDate: string) =>
    medication
      ? Math.max(1, Math.floor((daysSince(medication.startDate, now) - daysSince(captureDate, now)) / 7) + 1)
      : null;

  const openWorkoutHistory = () => {
    setWorkoutHistoryOpen(true);
    void data.refreshWorkouts();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.secthead}>
            <View>
              <Text style={styles.stitle}>Progress</Text>
              <Text style={styles.ssub}>
                {weeksOnMed != null && medName ? `${weeksOnMed} weeks on ${medName}` : "Tracking your progress"}
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

          {/* muscle retention */}
          {retentionState === "loading" ? (
            <SkeletonCard lines={4} style={styles.cardGap} />
          ) : retentionState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : retentionState === "empty" ? (
            <EmptyState
              title="Muscle retention is gathering"
              message="Your first weekly check-in starts this chart. Log meals and workouts to begin."
              style={styles.cardGap}
            />
          ) : (
            <View style={styles.chartcard}>
              <View style={styles.ctitle}>
                <Text style={styles.cTitleText}>Muscle retention</Text>
                <Text style={styles.cval}>
                  {retentionChart.currentLabel ? RETENTION_TEXT[retentionChart.currentLabel] : ""}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <LineChart points={retentionPoints} height={92} stroke={colors.emerald} showDots showBaseline />
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisLabel}>Wk 1</Text>
                <Text style={styles.axisLabel}>Wk {Math.ceil(retentionChart.snapshots.length / 2)}</Text>
                <Text style={styles.axisLabel}>Wk {retentionChart.snapshots.length}</Text>
              </View>
            </View>
          )}

          {/* weight */}
          {weightState === "loading" ? (
            <SkeletonCard lines={3} style={styles.cardGap} />
          ) : weightState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : weightState === "empty" ? (
            <EmptyState
              title="No weigh-ins yet"
              message="Log your weight to see your trend here."
              style={styles.cardGap}
            />
          ) : (
            <View style={styles.chartcard}>
              <View style={styles.ctitle}>
                <Text style={styles.cTitleText}>Weight</Text>
                <Text style={styles.cval}>
                  ↓ {lost.toFixed(0)} {unit} since start
                </Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <LineChart points={weightPoints} height={64} stroke={colors.emeraldDeep} />
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisDark}>
                  {startWeight} {unit}
                </Text>
                <Text style={styles.axisDark}>
                  {todayWeight} {unit} today
                </Text>
                <Text style={styles.axisDark}>
                  {weightChart.goalWeight} {unit} goal
                </Text>
              </View>
            </View>
          )}

          {/* workout sessions */}
          <View style={styles.trainingWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Workout sessions"
              onPress={openWorkoutHistory}
              style={({ pressed }) => [styles.trainingCard, pressed && styles.trainingCardPressed]}
            >
              <View style={styles.trainingIcon}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
                </Svg>
              </View>
              <View style={styles.flex}>
                <Text style={styles.trainingEyebrow}>{workoutSessionsCard.eyebrow}</Text>
                <Text style={styles.trainingTitle}>{workoutSessionsCard.title}</Text>
                <Text style={styles.trainingSub}>{workoutSessionsCard.detail}</Text>
              </View>
              <View style={styles.trainingCta}>
                <Text style={styles.trainingCtaText}>{workoutSessionsCard.cta}</Text>
                <Text style={styles.trainingChev}>›</Text>
              </View>
            </Pressable>
          </View>

          {/* weekly check-in history */}
          <View style={styles.aiWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Weekly check-ins"
              onPress={() => setCheckinHistoryOpen(true)}
              style={styles.historyRow}
            >
              <View style={styles.flex}>
                <Text style={styles.historyTitle}>Weekly check-ins</Text>
                <Text style={styles.historySub}>Every check-in and the verdict it earned</Text>
              </View>
              <Text style={styles.historyChev}>›</Text>
            </Pressable>
          </View>

          {/* coach prompt */}
          <View style={styles.aiWrap}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ask the coach" onPress={openCoach}>
              <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.aitext}>Wondering why the scale's quiet? Ask the coach.</Text>
                <Text style={styles.aichev}>›</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* progress photos */}
          <View style={styles.libHead}>
            <Text style={styles.libTitle}>Progress photos</Text>
          </View>
          {photosState === "loading" ? (
            <SkeletonCard lines={2} style={styles.cardGap} />
          ) : photosState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ptl}>
                <AddPhotoThumb onPress={openProgressPhoto} />
                {photos.map((p) => {
                  const wk = weekOf(p.captureDate);
                  return (
                    <ProgressPhotoThumb
                      key={p.id}
                      uri={p.viewUrl}
                      label={wk != null ? `Wk ${wk}` : "Photo"}
                    />
                  );
                })}
              </ScrollView>
              {photos.length === 0 ? (
                <EmptyState
                  message="Add your first progress photo to start tracking visual changes."
                  style={styles.cardGap}
                />
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <CoachChatScreen
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        onUpgrade={() => {
          setCoachOpen(false);
          setSubscriptionOpen(true);
        }}
      />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <CheckinHistoryScreen
        visible={checkinHistoryOpen}
        onClose={() => setCheckinHistoryOpen(false)}
        onSelect={(item) => setSelectedCheckin(item)}
      />
      <CheckinDetailScreen
        visible={selectedCheckin !== null}
        item={selectedCheckin}
        onClose={() => setSelectedCheckin(null)}
      />
      <WorkoutHistoryScreen
        visible={workoutHistoryOpen}
        workouts={data.workouts}
        onClose={() => setWorkoutHistoryOpen(false)}
        onSelectLog={(log) => setSelectedWorkoutLog(log)}
      />
      <WorkoutDetailScreen
        visible={selectedWorkoutLog !== null}
        log={selectedWorkoutLog}
        workouts={data.workouts}
        onClose={() => setSelectedWorkoutLog(null)}
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
  // chart card
  chartcard: { marginHorizontal: 20, marginTop: 6, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  cardGap: { marginBottom: 12 },
  ctitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cTitleText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  cval: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  axisLabel: { fontFamily: font.semibold, fontSize: 10.5, color: colors.faint },
  axisDark: { fontFamily: font.semibold, fontSize: 12, color: colors.muted },
  // workout sessions
  trainingWrap: { paddingHorizontal: 20, marginBottom: 12 },
  trainingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(47,184,122,0.24)", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16 },
  trainingCardPressed: { opacity: 0.72 },
  trainingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.12)" },
  trainingEyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.84, color: colors.emeraldDeep },
  trainingTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 3 },
  trainingSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  trainingCta: { flexDirection: "row", alignItems: "center", gap: 4 },
  trainingCtaText: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  trainingChev: { fontFamily: font.semibold, fontSize: 20, color: colors.emeraldDeep },
  // check-in history entry
  flex: { flex: 1 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 12 },
  historyTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  historySub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  historyChev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
  // coach prompt
  aiWrap: { paddingHorizontal: 20 },
  aicard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  aitext: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  aichev: { fontFamily: font.bold, fontSize: 16, color: colors.emeraldDeep },
  // photos
  libHead: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  libTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  ptl: { gap: 9, paddingHorizontal: 20, paddingTop: 2 },
});

export default ProgressScreen;
