import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import type { MuscleRetentionLabel, SubscriptionStatus } from "@leanient/shared";
import { useNavigation } from "@react-navigation/native";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { UserAvatar } from "../../components/app/UserAvatar";
import { GoalPathChart, MuscleTrendChart, TrendChart } from "../../components/app/ProgressCharts";
import { ProjectedPathCard } from "../../components/app/ProjectedPathCard";
import { buildProjectedPath } from "./projectedPath";
import { AddPhotoThumb, ProgressPhotoThumb } from "../../components/app/ProgressPhotoThumb";
import { SkeletonCard } from "../../components/app/LoadingSkeleton";
import { ErrorState } from "../../components/app/ErrorState";
import { EmptyState } from "../../components/app/EmptyState";
import { CoachChatScreen } from "./CoachChatScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { CheckinHistoryScreen } from "./CheckinHistoryScreen";
import { StreakScreen } from "../../components/app/StreakScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { resolveSectionState } from "./sectionState";
import { buildProgressRetentionChart } from "./progressMetrics";
import {
  buildConsistencyHeat,
  buildGoalPath,
  buildLockedReads,
  buildMuscleTrend,
  buildPhotoSpread,
  buildProgressCoachLine,
  buildProgressHeader,
  buildWeightTrend,
} from "./progressRedesign";
import { buildMedals } from "./medals";
import { computeStreak, loadStreakStore, type StreakStore } from "./streak";
import { DayReviewCard } from "../../components/app/DayReviewCard";
import { buildDayReviews } from "./dayReview";
import { loadSessionStarts, type SessionStartMap } from "./sessionStarts";
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

/** The eyebrow's second word for the muscle card, keyed to the verdict. */
const MUSCLE_WORD: Record<MuscleRetentionLabel, string> = {
  keeping_muscle: "KEPT",
  maintaining: "HOLDING",
  losing_some: "YOUR TREND",
  losing_muscle: "YOUR TREND",
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

function Sprout() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21v-8" />
      <Path d="M12 13c0-4 3-6.5 8-6.5-.8 4.5-3.5 6.5-8 6.5z" />
      <Path d="M12 13c0-3-2-4.5-5.5-4.5.7 3.5 2.7 4.5 5.5 4.5z" />
    </Svg>
  );
}

function Wave() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 15c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-10 5-10 2.5 5 3 5" />
    </Svg>
  );
}

function Lock() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 11h14v9H5z" />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

function Trophy() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
    </Svg>
  );
}

function FlagW() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 21V5a2 2 0 0 1 2-2h11l-2.5 4L18 11H7" />
    </Svg>
  );
}

function Chips({ chips }: { chips: Array<{ text: string; em?: boolean }> }) {
  return (
    <View style={styles.chips}>
      {chips.map((chip) => (
        <View key={chip.text} style={[styles.chip, chip.em && styles.chipEm]}>
          <Text style={[styles.chipText, chip.em && styles.chipTextEm]}>{chip.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProgressScreen() {
  const auth = useAuth();
  const data = useLeanientData();
  const { openFaceCheck, openProgressPhoto } = useQuickActions();
  const navigation = useNavigation();
  const refreshedForUserRef = useRef<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [checkinHistoryOpen, setCheckinHistoryOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [faceConsentOpen, setFaceConsentOpen] = useState(false);
  const [faceMetrics, setFaceMetrics] = useState<FaceMetric[]>([]);
  const now = new Date();

  const SUBSCRIBED: SubscriptionStatus[] = ["trialing", "active", "active_canceled"];
  const subscribed = auth.user ? SUBSCRIBED.includes(auth.user.subscriptionStatus) : false;
  const openCoach = () => (subscribed ? setCoachOpen(true) : setSubscriptionOpen(true));

  const overview = data.progressOverview;
  const profile = data.profile;
  const medication = data.medicationProtocol;
  const weightLogs = data.weightLogs;

  // Device-local streak store, same source as Home's sprout chip.
  const [streakStore, setStreakStore] = useState<StreakStore>({ wonDates: [], longest: 0 });
  useEffect(() => {
    let alive = true;
    void loadStreakStore().then((store) => {
      if (alive) setStreakStore(store);
    });
    return () => {
      alive = false;
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
  const streakRead = useMemo(() => computeStreak(streakStore, now), [streakStore]);

  // Device-local started-session map, refreshed when the tab regains focus data.
  const [sessionStarts, setSessionStarts] = useState<SessionStartMap>({});
  useEffect(() => {
    let alive = true;
    void loadSessionStarts().then((map) => {
      if (alive) setSessionStarts(map);
    });
    return () => {
      alive = false;
    };
  }, [data.workoutHistory]);

  // The last 7 days as what actually happened (protein, session, food, burn).
  const dayReviews = useMemo(() => {
    if (!profile) return [];
    const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1] : null;
    const weightLb = latestWeight ? (latestWeight.unit === "kg" ? latestWeight.value * 2.2046226 : latestWeight.value) : null;
    return buildDayReviews({
      meals: data.recentMeals,
      workouts: data.workoutHistory,
      sessionStarts,
      dailyProteinTarget: profile.dailyProteinTarget,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      weightLb,
      now,
    });
    // `now` is intentionally omitted: it's a fresh Date each render and the
    // review only cares about the calendar day.
  }, [profile, weightLogs, data.recentMeals, data.workoutHistory, sessionStarts]);

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

  const weeksOnMed =
    overview?.summary.weeksOnProtocol ??
    (medication ? Math.max(1, Math.floor(daysSince(medication.startDate, now) / 7)) : null);
  const medName = overview?.summary.medicationName ?? medication?.medicationName ?? null;

  // Header: coach greeting built from the logs, streak sprout beside it.
  const header = buildProgressHeader({ weightLogs, weeksOnMed, now });

  const snapshots = overview?.chart.snapshots ?? [];
  const retentionChart = useMemo(() => buildProgressRetentionChart(snapshots), [snapshots]);
  const muscleTrend = useMemo(() => buildMuscleTrend(retentionChart.snapshots, 0), [retentionChart.snapshots]);

  // The weight card: smoothed weekly trend + raw noise dots, full journey.
  const weightTrend = useMemo(
    () => buildWeightTrend({ weightLogs, goalWeight: profile?.goalWeight, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [weightLogs, profile?.goalWeight],
  );

  // The goal path always reads the FULL history, so the plan line starts at the
  // true first weigh-in regardless of the visible window.
  const goalPath = useMemo(
    () => buildGoalPath({ weightLogs, profile, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [weightLogs, profile?.goalWeight, profile?.goalWeightUnit, profile?.goalPace],
  );

  const lockedReads = buildLockedReads({
    weighInCount: weightLogs.length,
    hasGoal: !!profile?.goalWeight,
    snapshotCount: snapshots.length,
  });
  const coachLine = buildProgressCoachLine({ goalPath, header, weightLogs, now });

  // The last 30 days as the work: every log type counts toward the heat.
  const heat = useMemo(
    () =>
      buildConsistencyHeat({
        meals: data.monthMeals,
        workouts: data.workoutHistory,
        weightLogs,
        doseLogs: data.doseHistory,
        snapshots,
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [data.monthMeals, data.workoutHistory, weightLogs, data.doseHistory, snapshots],
  );

  // Milestones: real-feat medals, earned first, "All medals" opens the screen.
  const medals = useMemo(
    () =>
      buildMedals({
        doseLogs: data.doseHistory,
        weightLogs,
        snapshotWeeks: snapshots.map((snap) => snap.weekOf),
        photoDates: data.progressPhotos.map((photo) => photo.captureDate),
        streak: streakRead,
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render Date
    [data.doseHistory, weightLogs, snapshots, data.progressPhotos, streakRead],
  );
  const earnedCount = medals.filter((m) => m.earned).length;
  const milestoneCards = [...medals.filter((m) => m.earned), ...medals.filter((m) => !m.earned)].slice(0, 3);

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

  // Cold start: while there are no weigh-ins yet, draw the road ahead instead
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

  // Body photo timeline: first / middle / latest across the journey.
  const photoSpread = buildPhotoSpread(data.progressPhotos, weekOf);

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

  const muscleWord = retentionChart.currentLabel ? MUSCLE_WORD[retentionChart.currentLabel] : "YOUR TREND";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* coach greeting header */}
          <View style={styles.phead}>
            <Text style={styles.pg} numberOfLines={2}>
              {header.title}
            </Text>
            <View style={styles.pheadRight}>
              {streakRead.days > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${streakRead.days} day streak. Open your streak`}
                  hitSlop={6}
                  onPress={() => setStreakOpen(true)}
                  style={styles.ypill}
                >
                  <Sprout />
                  <Text style={styles.ypillText}>{streakRead.days}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                hitSlop={8}
                onPress={() => navigation.navigate("Profile" as never)}
              >
                <UserAvatar />
              </Pressable>
            </View>
          </View>
          <Text style={styles.psub}>{header.sub}</Text>

          {/* weight — the smoothed trend, daily noise demoted to faint dots */}
          {weightState === "loading" ? (
            <SkeletonCard lines={4} style={styles.cardGap} />
          ) : weightState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : weightState === "empty" || !weightTrend ? (
            projectedPath ? (
              <ProjectedPathCard path={projectedPath} style={styles.cardGap} />
            ) : (
              <EmptyState
                title="No weigh-ins yet"
                message="Log your weight to see your trend here."
                style={styles.cardGap}
              />
            )
          ) : (
            <View style={styles.gcard}>
              <View style={styles.ghead}>
                <Text style={styles.eyebrow}>
                  WEIGHT · <Text style={styles.eyebrowEm}>YOUR TREND</Text>
                </Text>
                <Text style={styles.gval}>{weightTrend.deltaLabel}</Text>
              </View>
              <TrendChart view={weightTrend} projectionLabel={weightTrend.projection ? "where you're headed" : undefined} />
              <View style={styles.axis}>
                {weightTrend.axis.map((label) => (
                  <Text key={label} style={styles.axisLabel}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.gnote}>
                <View style={styles.gic}>
                  <Wave />
                </View>
                <Text style={styles.gnoteText}>{weightTrend.note}</Text>
              </View>
            </View>
          )}

          {/* goal path — your line vs the plan you set at onboarding */}
          {goalPath ? (
            <View style={styles.gcard}>
              <View style={styles.ghead}>
                <Text style={styles.eyebrow}>
                  GOAL PATH · <Text style={styles.eyebrowEm}>{goalPath.goalLabel}</Text>
                </Text>
                <Text style={styles.gval}>{goalPath.headline}</Text>
              </View>
              <GoalPathChart view={goalPath} />
              <Chips chips={goalPath.chips} />
            </View>
          ) : null}

          {/* reads that need more data say exactly what unlocks them */}
          {lockedReads.map((read) => (
            <View key={read.key} style={styles.locked}>
              <View style={styles.lic}>
                <Lock />
              </View>
              <View style={styles.flex}>
                <Text style={styles.lockedTitle}>{read.title}</Text>
                <Text style={styles.lockedSub}>{read.sub}</Text>
              </View>
              <View style={styles.ldots}>
                {Array.from({ length: read.dots.total }, (_, i) => (
                  <View key={i} style={[styles.ldot, i < read.dots.filled && styles.ldotFilled]} />
                ))}
              </View>
            </View>
          ))}

          {/* the coach's one-line read, straight to the chat */}
          <Pressable accessibilityRole="button" accessibilityLabel="Ask the coach" onPress={openCoach} style={styles.coachline}>
            <View style={styles.cdot}>
              <Spark />
            </View>
            <Text style={styles.coachlineText}>{coachLine}</Text>
            <Text style={styles.coachlineChev}>›</Text>
          </Pressable>

          {/* the last 30 days as the work */}
          <View style={styles.gcard}>
            <View style={styles.ghead}>
              <Text style={styles.eyebrow}>
                LAST 30 DAYS · <Text style={styles.eyebrowEm}>THE WORK</Text>
              </Text>
              <Text style={styles.gval}>{heat.activeLabel}</Text>
            </View>
            <View style={styles.heat}>
              {heat.cells.map((cell, i) => (
                <View
                  key={i}
                  style={[
                    styles.heatCell,
                    cell.level === 1 && styles.heatL1,
                    cell.level === 2 && styles.heatL2,
                    cell.today && styles.heatToday,
                  ]}
                />
              ))}
            </View>
            <Chips chips={heat.chips} />
          </View>

          {/* muscle trend */}
          {retentionState === "loading" ? (
            <SkeletonCard lines={4} style={styles.cardGap} />
          ) : retentionState === "error" ? (
            <ErrorState onRetry={() => void data.refreshProgress()} style={styles.cardGap} />
          ) : retentionState === "empty" ? null : (
            <View style={styles.gcard}>
              <View style={styles.ghead}>
                <Text style={styles.eyebrow}>
                  MUSCLE · <Text style={styles.eyebrowEm}>{muscleWord}</Text>
                </Text>
                {muscleTrend ? (
                  <Text style={styles.gval}>
                    {muscleTrend.deltaLabel} <Text style={styles.gvalSuffix}>{muscleTrend.deltaSuffix}</Text>
                  </Text>
                ) : null}
              </View>
              {muscleTrend ? (
                <>
                  <MuscleTrendChart points={muscleTrend.points} />
                  <View style={styles.axis}>
                    <Text style={styles.axisLabel}>{muscleTrend.axis[0]}</Text>
                    <Text style={styles.axisLabel}>{muscleTrend.axis[1]}</Text>
                  </View>
                </>
              ) : null}
            </View>
          )}

          {/* milestones — dignified medals from real feats */}
          <View style={styles.mhead}>
            <Text style={styles.eyebrow}>
              MILESTONES · <Text style={styles.eyebrowEm}>{earnedCount} {earnedCount === 1 ? "MEDAL" : "MEDALS"}</Text>
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="All medals" hitSlop={8} onPress={() => setStreakOpen(true)}>
              <Text style={styles.mall}>All medals ›</Text>
            </Pressable>
          </View>
          <View style={styles.mrow}>
            {milestoneCards.map((medal) => (
              <View key={medal.key} style={[styles.mcard, !medal.earned && styles.mcardLocked]}>
                <View style={[styles.mic, medal.amber ? styles.micAmber : styles.micGreen, !medal.earned && styles.micLocked]}>
                  {medal.earned ? medal.amber ? <Trophy /> : <FlagW /> : <Lock />}
                </View>
                <Text style={styles.mt} numberOfLines={2}>
                  {medal.name}
                </Text>
                <Text style={styles.md} numberOfLines={2}>
                  {medal.sub}
                </Text>
              </View>
            ))}
          </View>

          {/* body photo timeline */}
          <View style={styles.photos}>
            {photoSpread.map((photo) => (
              <View key={photo.id} style={styles.ph}>
                {photo.uri ? <Image source={{ uri: photo.uri }} style={styles.phImg} resizeMode="cover" /> : null}
                <View style={styles.phLabel}>
                  <Text style={styles.phLabelText}>{photo.label}</Text>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a progress photo"
              onPress={openProgressPhoto}
              style={[styles.ph, styles.phAdd]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Circle cx={12} cy={13} r={3.4} />
              </Svg>
              <Text style={styles.phAddText}>Add</Text>
            </Pressable>
          </View>

          {/* the last 7 days as what actually happened, expandable per day */}
          <DayReviewCard reviews={dayReviews} />

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

          {/* face photos — body progress photos live in the timeline above */}
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

      <StreakScreen visible={streakOpen} streak={streakRead} medals={medals} onClose={() => setStreakOpen(false)} />

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
  // header
  phead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  pg: { flex: 1, fontFamily: font.extrabold, fontSize: 24, letterSpacing: -0.62, color: colors.ink },
  pheadRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  ypill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(47,184,122,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  ypillText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: -0.12, color: colors.emeraldDeep },
  psub: { paddingHorizontal: 20, paddingTop: 2, fontFamily: font.medium, fontSize: 13, color: colors.muted },
  // graph cards
  gcard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  cardGap: { marginTop: 12, marginBottom: 0 },
  ghead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  eyebrowEm: { color: colors.emeraldDeep },
  gval: { fontFamily: font.extrabold, fontSize: 15, letterSpacing: -0.3, color: colors.emeraldDeep },
  gvalSuffix: { color: colors.ink },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  axisLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.3, color: colors.faint },
  gnote: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11 },
  gic: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(47,184,122,0.12)", alignItems: "center", justifyContent: "center" },
  gnoteText: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft },
  // chips
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { backgroundColor: colors.sageFill, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipText: { fontFamily: font.bold, fontSize: 11, letterSpacing: -0.05, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  // consistency heat
  heat: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 10 },
  heatCell: { width: 16, height: 16, borderRadius: 5, backgroundColor: colors.sageFill },
  heatL1: { backgroundColor: "rgba(47,184,122,0.3)" },
  heatL2: { backgroundColor: colors.emerald },
  heatToday: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.emerald },
  // locked reads
  locked: { flexDirection: "row", alignItems: "center", gap: 13, marginHorizontal: 20, marginTop: 12, backgroundColor: colors.sageFill, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.faintest, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  lic: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  lockedTitle: { fontFamily: font.extrabold, fontSize: 14.5, letterSpacing: -0.22, color: colors.inkSoft },
  lockedSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  ldots: { flexDirection: "row", gap: 4 },
  ldot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.faintest },
  ldotFilled: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  // coachline
  coachline: { flexDirection: "row", alignItems: "center", gap: 11, marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  cdot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  coachlineText: { flex: 1, fontFamily: font.bold, fontSize: 13.5, letterSpacing: -0.14, color: colors.ink },
  coachlineChev: { fontFamily: font.semibold, fontSize: 17, color: colors.emeraldDeep },
  // milestones
  mhead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 22, marginTop: 16 },
  mall: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  mrow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 8 },
  mcard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  mcardLocked: { opacity: 0.75 },
  mic: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  micAmber: { backgroundColor: colors.amber },
  micGreen: { backgroundColor: colors.emeraldDeep },
  micLocked: { backgroundColor: colors.sageFill },
  mt: { fontFamily: font.extrabold, fontSize: 14, letterSpacing: -0.21, lineHeight: 18, color: colors.ink },
  md: { fontFamily: font.medium, fontSize: 11.5, color: colors.faint, marginTop: 3 },
  // body photo timeline
  photos: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 12 },
  ph: { flex: 1, aspectRatio: 3 / 4, borderRadius: 16, overflow: "hidden", backgroundColor: colors.sageFill, borderWidth: 1, borderColor: colors.line },
  phImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  phLabel: { position: "absolute", left: 8, bottom: 8, backgroundColor: "rgba(23,25,27,0.75)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  phLabelText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: "#F4F8EF" },
  phAdd: { borderStyle: "dashed", borderColor: colors.faintest, borderWidth: 1.5, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: 6 },
  phAddText: { fontFamily: font.semibold, fontSize: 11, color: colors.muted },
  // check-in history entry
  flex: { flex: 1 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, marginTop: 10, marginBottom: 12, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  historyTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  historySub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  historyChev: { fontFamily: font.semibold, fontSize: 20, color: colors.faint },
  aiWrap: { paddingHorizontal: 20 },
  // photos + face
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
