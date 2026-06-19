import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import type { MuscleRetentionLabel, SubscriptionStatus } from "@leanient/shared";
import { useNavigation } from "@react-navigation/native";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { UserAvatar } from "../../components/app/UserAvatar";
import { LineChart } from "../../components/app/LineChart";
import { ProjectedPathCard } from "../../components/app/ProjectedPathCard";
import { buildProjectedPath } from "./projectedPath";
import { AddPhotoThumb, ProgressPhotoThumb } from "../../components/app/ProgressPhotoThumb";
import { SkeletonCard } from "../../components/app/LoadingSkeleton";
import { ErrorState } from "../../components/app/ErrorState";
import { EmptyState } from "../../components/app/EmptyState";
import { CoachChatScreen } from "./CoachChatScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { CheckinHistoryScreen } from "./CheckinHistoryScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { resolveSectionState } from "./sectionState";
import {
  CHART_RANGES,
  buildProgressRetentionChart,
  buildProgressWeightChart,
  chartRangeTitle,
  filterByChartRange,
  muscleKeptStreak,
  type ChartRangeId,
} from "./progressMetrics";
import { GoalJourneyCard } from "../../components/app/GoalJourneyCard";
import { buildGoalJourney } from "./goalJourney";
import { buildFaceProgress } from "./faceProgress";
import { faceFullnessLabel } from "./progressPhotoMeta";
import { faceConsentState } from "./faceConsent";
import { isFaceDetectionAvailable } from "./faceLandmarks";
import { FaceAnalysisConsentScreen } from "./FaceAnalysisConsentScreen";
import { buildFaceProtectionSignal } from "./faceProtection";
import { FaceProtectionCard } from "../../components/app/FaceProtectionCard";
import { CountUpText } from "../../components/ui/CountUpText";
import { buildFaceVolumeTrend, type FaceMetric } from "./faceMetrics";
import { loadFaceMetrics } from "./faceMetricsStore";
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

function RangeToggle({ value, onChange }: { value: ChartRangeId; onChange: (next: ChartRangeId) => void }) {
  return (
    <View style={styles.rangeRow}>
      {CHART_RANGES.map((range) => {
        const on = range.id === value;
        return (
          <Pressable
            key={range.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Show ${range.title}`}
            hitSlop={6}
            onPress={() => onChange(range.id)}
            style={[styles.rangePill, on && styles.rangePillOn]}
          >
            <Text style={[styles.rangeText, on && styles.rangeTextOn]}>{range.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const { openFaceCheck } = useQuickActions();
  const navigation = useNavigation();
  const refreshedForUserRef = useRef<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [checkinHistoryOpen, setCheckinHistoryOpen] = useState(false);
  const [faceConsentOpen, setFaceConsentOpen] = useState(false);
  const [faceMetrics, setFaceMetrics] = useState<FaceMetric[]>([]);
  const [retentionRange, setRetentionRange] = useState<ChartRangeId>("all");
  const [weightRange, setWeightRange] = useState<ChartRangeId>("all");
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
  const kept = muscleKeptStreak(snapshots);
  const retentionChart = useMemo(
    () =>
      buildProgressRetentionChart(
        filterByChartRange(snapshots, (s) => s.weekOf, retentionRange, now),
        (label) => RETENTION_COLOR[label],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [snapshots, retentionRange],
  );
  const weightChart = useMemo(
    () =>
      buildProgressWeightChart({
        weightLogs: filterByChartRange(weightLogs, (log) => log.measuredAt, weightRange, now),
        fallbackUnit: profile?.goalWeightUnit ?? "lb",
        goalWeight: profile?.goalWeight,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [profile?.goalWeight, profile?.goalWeightUnit, weightLogs, weightRange],
  );
  // The journey-to-goal uses ALL weigh-ins (not the range window), so "since you
  // started" and the pace ETA reflect the true start, not the visible slice.
  const goalJourney = useMemo(
    () => buildGoalJourney({ weightLogs, profile, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [weightLogs, profile?.goalWeight, profile?.goalWeightUnit, profile?.goalPace],
  );
  // Week numbers stay absolute when a window hides earlier weeks.
  const firstVisibleWeek =
    retentionChart.snapshots.length > 0
      ? Math.max(0, snapshots.filter((s) => s.weekOf < retentionChart.snapshots[0].weekOf).length)
      : 0;
  const retentionState = resolveSectionState({
    hasData: snapshots.length > 0,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!(data.progressPhotosError ?? data.homeError),
  });
  const weightState = resolveSectionState({
    hasData: weightLogs.length > 0 && !!profile,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!(data.progressPhotosError ?? data.homeError),
  });
  const allPhotos = data.progressPhotos.slice().sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1));

  const { points: weightPoints, unit, startWeight, todayWeight, lost } = weightChart;
  const { points: retentionPoints } = retentionChart;

  // Cold start: while there's no retention data yet, draw the road ahead instead
  // of a blank chart — the projected weight path to goal + the muscle at stake.
  const projectedPath = useMemo(() => {
    const current = weightLogs.length ? weightLogs[weightLogs.length - 1].value : null;
    if (current == null || !profile?.goalWeight) return null;
    return buildProjectedPath({
      currentWeight: current,
      goalWeight: profile.goalWeight,
      goalWeightUnit: profile.goalWeightUnit,
      goalPace: profile.goalPace,
      medicationName: medName,
      now,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
  }, [weightLogs, profile?.goalWeight, profile?.goalWeightUnit, profile?.goalPace, medName]);

  const weekOf = (captureDate: string) =>
    medication
      ? Math.max(1, Math.floor((daysSince(medication.startDate, now) - daysSince(captureDate, now)) / 7) + 1)
      : null;

  const faceProgress = buildFaceProgress(allPhotos, weekOf);
  const faceProtection = buildFaceProtectionSignal(snapshots);
  const faceConsent = faceConsentState(auth.user);
  // The on-device measurement (and its controls) only exist in a build with the
  // native module — never in Expo Go, where it would do nothing.
  const faceDetectionAvailable = isFaceDetectionAvailable();
  const volumeTrend = buildFaceVolumeTrend(faceMetrics);
  // Show the Face & skin analysis section only when it has something in it.
  const showFaceSkin =
    Boolean(faceProtection) || (faceDetectionAvailable && (!faceConsent.enabled || Boolean(volumeTrend)));

  // Load on-device facial measurements (local only) when tracking is on. Re-run
  // when a new face check lands (photo count changes) or consent flips.
  const userId = auth.user?.id;
  useEffect(() => {
    let cancelled = false;
    if (!userId || !faceConsent.enabled) {
      setFaceMetrics([]);
      return;
    }
    void loadFaceMetrics(userId).then((metrics) => {
      if (!cancelled) setFaceMetrics(metrics);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, faceConsent.enabled, allPhotos.length]);

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
              {kept >= 2 ? (
                <View style={styles.streakPill}>
                  <View style={styles.streakDot} />
                  <Text style={styles.streakText}>
                    {kept} weeks keeping muscle
                  </Text>
                </View>
              ) : null}
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

          {/* coach prompt — kept at the top so it isn't buried */}
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

          {/* muscle retention */}
          {retentionState === "loading" ? (
            <SkeletonCard lines={4} style={styles.cardGap} />
          ) : retentionState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : retentionState === "empty" ? (
            projectedPath ? (
              <ProjectedPathCard path={projectedPath} style={styles.cardGap} />
            ) : (
              <EmptyState
                title="Muscle retention is gathering"
                message="Your first weekly check-in starts this chart. Log meals and workouts to begin."
                style={styles.cardGap}
              />
            )
          ) : (
            <View style={styles.chartcard}>
              <View style={styles.ctitle}>
                <Text style={styles.cTitleText}>Muscle retention</Text>
                <Text style={styles.cval}>
                  {retentionChart.currentLabel ? RETENTION_TEXT[retentionChart.currentLabel] : ""}
                </Text>
              </View>
              <RangeToggle value={retentionRange} onChange={setRetentionRange} />
              {retentionChart.snapshots.length === 0 ? (
                <Text style={styles.rangeEmpty}>No check-ins in this window yet.</Text>
              ) : (
                <>
                  <View style={{ marginTop: 12 }}>
                    <LineChart points={retentionPoints} height={92} stroke={colors.emerald} showDots showBaseline />
                  </View>
                  <View style={styles.axis}>
                    <Text style={styles.axisLabel}>Wk {firstVisibleWeek + 1}</Text>
                    <Text style={styles.axisLabel}>
                      Wk {firstVisibleWeek + Math.ceil(retentionChart.snapshots.length / 2)}
                    </Text>
                    <Text style={styles.axisLabel}>Wk {firstVisibleWeek + retentionChart.snapshots.length}</Text>
                  </View>
                </>
              )}
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
                  ↓ {lost.toFixed(0)} {unit} {chartRangeTitle(weightRange)}
                </Text>
              </View>
              <RangeToggle value={weightRange} onChange={setWeightRange} />
              {weightPoints.length === 0 ? (
                <Text style={styles.rangeEmpty}>No weigh-ins in this window yet.</Text>
              ) : (
                <>
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
                </>
              )}
            </View>
          )}

          {/* journey to goal — start → now → goal, paced by their chosen speed */}
          {goalJourney ? <GoalJourneyCard view={goalJourney} /> : null}

          {/* face & skin — the analysis signal (not photos), surfaced high */}
          {showFaceSkin ? (
            <>
              <View style={styles.libHead}>
                <Text style={styles.libTitle}>Face &amp; skin</Text>
              </View>
              {faceProtection ? <FaceProtectionCard signal={faceProtection} /> : null}

              {/* on-device facial-volume measurement — the result/data */}
              {faceDetectionAvailable && faceConsent.enabled && volumeTrend ? (
                <View style={styles.volCard}>
                  <View style={styles.volTop}>
                    <Text style={styles.volLabel}>FACIAL VOLUME · on-device</Text>
                    <CountUpText value={volumeTrend.latestIndex} style={styles.volIndex} />
                  </View>
                  <Text style={styles.volLine}>{volumeTrend.line}</Text>
                </View>
              ) : null}

              {/* discovery invite — only when off; managing it lives in Settings */}
              {faceDetectionAvailable && !faceConsent.enabled ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Turn on facial volume tracking"
                  onPress={() => setFaceConsentOpen(true)}
                  style={({ pressed }) => [styles.trackRow, pressed && styles.trackRowPressed]}
                >
                  <View style={styles.trackIcon}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={12} cy={12} r={9} />
                      <Path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0" />
                    </Svg>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.trackTitle}>Turn on facial volume tracking</Text>
                    <Text style={styles.trackSub}>Measure facial volume on-device. Nothing leaves your phone.</Text>
                  </View>
                  <Text style={styles.trackChev}>›</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {/* face photos — body progress photos now live on Home */}
          <View style={styles.libHead}>
            <Text style={styles.libTitle}>Face photos</Text>
            {faceProgress?.latestFullness != null ? (
              <Text style={styles.faceMeta}>{faceFullnessLabel(faceProgress.latestFullness)}</Text>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ptl}>
            <AddPhotoThumb onPress={openFaceCheck} />
            {faceProgress?.photos.map((p) => (
              <ProgressPhotoThumb key={p.id} uri={p.viewUrl} label={p.weekLabel} sublabel={p.fullnessLabel ?? undefined} />
            ))}
          </ScrollView>
          {faceProgress?.trend ? (
            <Text style={styles.faceTrend}>{faceProgress.trend}</Text>
          ) : (
            <Text style={styles.faceTrend}>
              Take a weekly face check. Protein and a gentle loss pace are what keep your face full.
            </Text>
          )}

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
        </ScrollView>
      </SafeAreaView>

      <FaceAnalysisConsentScreen visible={faceConsentOpen} onClose={() => setFaceConsentOpen(false)} />

      <CoachChatScreen
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        onUpgrade={() => {
          setCoachOpen(false);
          setSubscriptionOpen(true);
        }}
      />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
      <CheckinHistoryScreen visible={checkinHistoryOpen} onClose={() => setCheckinHistoryOpen(false)} />
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
  streakPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(47,184,122,0.13)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, marginTop: 7 },
  streakDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald },
  streakText: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.2, color: colors.emeraldDeep },
  rangeRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  rangePill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.sageFill },
  rangePillOn: { backgroundColor: "rgba(47,184,122,0.16)" },
  rangeText: { fontFamily: font.semibold, fontSize: 12, color: colors.muted },
  rangeTextOn: { color: colors.emeraldDeep },
  rangeEmpty: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 16, marginBottom: 6 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.bold, fontSize: 13, color: "#5B6157" },
  // chart card
  chartcard: { marginHorizontal: 20, marginTop: 12, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  cardGap: { marginBottom: 12 },
  ctitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cTitleText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  cval: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  axisLabel: { fontFamily: font.semibold, fontSize: 10.5, color: colors.faint },
  axisDark: { fontFamily: font.semibold, fontSize: 12, color: colors.muted },
  // workout sessions
  // check-in history entry
  flex: { flex: 1 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, marginTop: 10, marginBottom: 12, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  historyTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  historySub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  historyChev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
  // coach prompt
  aiWrap: { paddingHorizontal: 20 },
  aicard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  aitext: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  aichev: { fontFamily: font.bold, fontSize: 16, color: colors.emeraldDeep },
  // photos
  libHead: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 6 },
  libTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  faceMeta: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep, marginTop: 2 },
  faceTrend: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, paddingHorizontal: 20, paddingTop: 10 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, shadowOpacity: 0.05, elevation: 1 },
  trackRowPressed: { opacity: 0.6 },
  trackIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(47,184,122,0.10)", alignItems: "center", justifyContent: "center" },
  trackTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  trackSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  trackChev: { fontFamily: font.semibold, fontSize: 18, color: colors.faint },
  volCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, shadowOpacity: 0.05, elevation: 1 },
  volTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  volLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, color: colors.emeraldDeep },
  volIndex: { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  volLine: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 6 },
  ptl: { gap: 9, paddingHorizontal: 20, paddingTop: 2 },
});

export default ProgressScreen;
