import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Path } from "react-native-svg";
import type { TodaysFocusResponse, UserMedicationProtocol, UserProfile, WeeklyVerdict, WeightLog, Workout } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { VerdictCard } from "../../components/app/VerdictCard";
import { MetricRing, TrendTile, InfoTile } from "../../components/app/MetricRing";
import { TodaysFocusCard } from "../../components/app/TodaysFocusCard";
import { VerdictExplainer } from "../../components/app/VerdictExplainer";
import { WeekPlanSheet } from "../../components/app/WeekPlanSheet";
import { TodayPlanSheet } from "../../components/app/TodayPlanSheet";
import { WorkoutPlayer } from "../../components/app/WorkoutPlayer";
import { WorkoutCompleteSheet } from "../../components/app/WorkoutCompleteSheet";
import { UserAvatar } from "../../components/app/UserAvatar";
import { useLeanientData } from "../../context/LeanientDataContext";
import { EmptyState } from "../../components/app/EmptyState";
import { ErrorState } from "../../components/app/ErrorState";
import { WeeklyCheckinScreen } from "./WeeklyCheckinScreen";
import { VerdictRevealScreen } from "./VerdictRevealScreen";
import { deriveHomeMetrics } from "./homeMetrics";
import { computeShotCycle, restCueForEnergy } from "./todayMetrics";
import { deriveTodayView, toTodayLog, type TodayLog } from "./todayMetrics";
import { deriveWeekPlan } from "./weekPlanMetrics";
import { deriveTodayPlan } from "./todayPlanMetrics";
import { buildGuidedWorkoutLogDraft, deriveWorkoutComplete } from "./workoutCompleteMetrics";
import type { CompletedWorkout } from "./workoutSession";
import { extractApiError } from "../../services/apiError";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekRangeLabel(weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "This week";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86_400_000));
}

interface HomeViewProps {
  verdict: WeeklyVerdict;
  profile: UserProfile;
  weightLogs: WeightLog[];
  medication?: UserMedicationProtocol;
  focus: TodaysFocusResponse | null;
  recommendedWorkouts: Workout[];
  todayLog: TodayLog;
}

function HomeView({ verdict, profile, weightLogs, medication, focus, recommendedWorkouts, todayLog }: HomeViewProps) {
  const data = useLeanientData();
  const navigation = useNavigation();
  const now = useRef(new Date()).current;
  const [scope, setScope] = useState<"week" | "today">("week");
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [todayPlanOpen, setTodayPlanOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [completed, setCompleted] = useState<CompletedWorkout | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [revealVerdict, setRevealVerdict] = useState<WeeklyVerdict | null>(null);

  // The verdict CTA opens the weekly check-in when one is due (the gathering /
  // no-data state uses nextActionCode "log_checkin"); otherwise it shows the plan.
  const handleVerdictAction = () => {
    if (verdict.nextActionCode === "log_checkin") setCheckinOpen(true);
    else setPlanOpen(true);
  };

  const metrics = useMemo(
    () =>
      deriveHomeMetrics({
        verdict,
        profile,
        weightLogs,
        medication,
        now,
      }),
    [verdict, profile, weightLogs, medication, now],
  );

  const today = useMemo(
    () => deriveTodayView({ profile, medication, recommendedWorkouts, dailyLog: todayLog, now }),
    [profile, medication, recommendedWorkouts, todayLog, now],
  );

  // Sessions for the weekly plan come straight from the live recommendations.
  const planSessions = recommendedWorkouts;
  const weekPlan = useMemo(
    () => deriveWeekPlan({ profile, verdict, medication, weightLogs, sessions: planSessions, now }),
    [profile, verdict, medication, weightLogs, planSessions, now],
  );

  // Today's plan is built from the top recommended session, when one exists.
  const recommendedWorkout = recommendedWorkouts[0] ?? null;
  // Rest cue follows the shot cycle so the player coaches the same shot-aware story.
  const restCue = restCueForEnergy(medication ? computeShotCycle(medication, now).phase.energy : null);
  const todayPlan = useMemo(
    () =>
      recommendedWorkout
        ? deriveTodayPlan({ profile, medication, recommendedWorkout, dailyLog: todayLog, now })
        : null,
    [profile, medication, recommendedWorkout, todayLog, now],
  );

  const contextLabel = useMemo(() => {
    const range = `Week of ${weekRangeLabel(verdict.weekOf)}`;
    if (medication) return `${range} · Day ${daysSince(medication.startDate, now)} on ${medication.medicationName}`;
    return range;
  }, [verdict.weekOf, medication, now]);

  const { protein, training, weight, dose, measurements } = metrics;

  // Completion summary (screen 21): fold the just-finished session into the
  // week's training + verdict. Null until a session completes.
  const completeView = useMemo(
    () =>
      completed
        ? deriveWorkoutComplete({
            summary: completed,
            trainingDone: training.done,
            trainingTarget: training.target,
            verdictStatus: verdict.status,
          })
        : null,
    [completed, training.done, training.target, verdict.status],
  );

  const confirmWorkoutComplete = async () => {
    if (!completed || !recommendedWorkout) return;

    setCompleteSaving(true);
    setCompleteError(null);
    try {
      await data.api.createWorkoutLog(
        buildGuidedWorkoutLogDraft({
          summary: completed,
          workout: recommendedWorkout,
          recordedAt: new Date().toISOString(),
        }),
      );
      await data.refreshHomeData();
      setCompleteOpen(false);
      setCompleted(null);
    } catch (error) {
      setCompleteError(extractApiError(error).message);
    } finally {
      setCompleteSaving(false);
    }
  };
  const weeklyDelta =
    weight.series.length >= 2 ? weight.series[weight.series.length - 1] - weight.series[weight.series.length - 2] : 0;
  const arrow = weeklyDelta <= 0 ? "↓" : "↑";
  const w = (n: number) => `${n}${weight.unit === "kg" ? "" : ""}`.replace(/\.0$/, "");

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* app bar */}
          <View style={styles.appbar}>
            <Text style={styles.wm}>Leanient</Text>
            <View style={styles.wtog}>
              {(["week", "today"] as const).map((k) => (
                <Pressable key={k} onPress={() => setScope(k)} style={[styles.wtogItem, scope === k && styles.wtogOn]}>
                  <Text style={[styles.wtogText, scope === k && styles.wtogTextOn]}>
                    {k === "week" ? "This week" : "Today"}
                  </Text>
                </Pressable>
              ))}
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

          {scope === "today" ? (
            /* ---- Today scope: daily, shot-cycle re-skin (screen 15) ---- */
            <>
              <VerdictCard verdict={verdict} contextLabel={today.contextLabel} override={today.hero} onAction={() => setTodayPlanOpen(true)} />

              <View style={styles.rings}>
                <MetricRing
                  ratio={today.protein.ratio}
                  value={`${today.protein.logged} / ${today.protein.target}g`}
                  label="Protein today"
                />
                <MetricRing
                  ratio={today.session.ratio}
                  value={`${today.session.done} / ${today.session.target}`}
                  label="Session today"
                />
                {today.nextShot.onProtocol ? (
                  <InfoTile
                    icon={
                      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
                      </Svg>
                    }
                    value={today.nextShot.label}
                    label="Next shot"
                  />
                ) : (
                  <TrendTile
                    series={weight.series}
                    deltaLabel={`${arrow} ${Math.abs(weeklyDelta).toFixed(1)} ${weight.unit}`}
                    label="This week"
                  />
                )}
              </View>

              {/* Adjust today's targets — link only until the targets editor exists */}
              <View style={styles.whylinkWrap}>
                <Text style={styles.whylink}>Adjust today's targets</Text>
              </View>

              {focus ? (
                <TodaysFocusCard focus={focus} eyebrow="DO THIS NEXT" />
              ) : (
                <EmptyState message="Your next move shows up here once you start logging meals and workouts." />
              )}

              <View style={styles.snap}>
                <Text style={styles.eyebrow}>LOGGED TODAY</Text>
                <View style={styles.loggedList}>
                  {today.loggedMeals.length ? (
                    today.loggedMeals.map((m, i) => (
                      <View key={`${m.name}-${i}`} style={styles.loggedRow}>
                        <View style={styles.loggedIcon}>
                          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 1-3 3-3 6s1 4 3 4v8" />
                          </Svg>
                        </View>
                        <Text style={styles.loggedName}>{m.name}</Text>
                        <Text style={styles.loggedVal}>
                          {m.grams}g · {m.timeLabel}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.loggedEmpty}>Nothing logged yet today.</Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            /* ---- This week scope ---- */
            <>
              <VerdictCard verdict={verdict} contextLabel={contextLabel} onAction={handleVerdictAction} />

              {/* metric rings */}
              {verdict.status !== "no_data" ? (
                <View style={styles.rings}>
                  <MetricRing
                    ratio={protein.ratio}
                    value={`${protein.logged} / ${protein.target}g`}
                    label="Protein"
                  />
                  <MetricRing
                    ratio={training.ratio}
                    value={`${training.done} / ${training.target}`}
                    label="Training"
                  />
                  <TrendTile
                    series={weight.series}
                    deltaLabel={`${arrow} ${Math.abs(weeklyDelta).toFixed(1)} ${weight.unit}`}
                    label="This week"
                  />
                </View>
              ) : null}

              {verdict.status !== "no_data" ? (
                <Pressable
                  style={styles.whylinkWrap}
                  accessibilityRole="button"
                  accessibilityLabel="Why this verdict?"
                  onPress={() => setExplainerOpen(true)}
                >
                  <Text style={styles.whylink}>Why this verdict?</Text>
                </Pressable>
              ) : null}

              {/* today's focus — hides itself when there's nothing actionable yet */}
              {focus ? <TodaysFocusCard focus={focus} /> : null}

              {/* dose */}
              <View style={styles.med}>
                <View>
                  <Text style={styles.mk}>LAST DOSE</Text>
                  <Text style={styles.mv}>{dose.lastLabel}</Text>
                </View>
                <View style={styles.mdiv} />
                <View>
                  <Text style={styles.mk}>NEXT DOSE</Text>
                  <Text style={styles.mv}>{dose.nextLabel}</Text>
                </View>
                <Pressable style={styles.mlogWrap}>
                  <Text style={styles.mlog}>Log dose ›</Text>
                </Pressable>
              </View>

              {/* this week's body */}
              <View style={styles.snap}>
                <Text style={styles.eyebrow}>THIS WEEK'S BODY</Text>
                <View style={styles.snaprow}>
                  <Pressable style={[styles.sc, styles.scAdd]}>
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                      <Circle cx={12} cy={13} r={3.2} />
                    </Svg>
                    <Text style={styles.scAddText}>Add this{"\n"}week's photo</Text>
                  </Pressable>
                  <View style={styles.sc}>
                    <Text style={styles.sk}>WEIGHT · 4 WK</Text>
                    <Svg width="100%" height={28} viewBox="0 0 120 28" preserveAspectRatio="none">
                      <Path
                        d={sparklinePath(weight.series)}
                        fill="none"
                        stroke={colors.emerald}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <View style={styles.svRow}>
                      <Text style={styles.sv}>
                        {w(weight.current)} {weight.unit}
                      </Text>
                      <Text style={styles.du}>
                        ↓ {Math.abs(weight.delta4wk).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sc}>
                    <Text style={styles.sk}>MEASUREMENTS</Text>
                    <Text style={styles.sm}>Waist {measurements.waist ?? "—"}"</Text>
                    <Text style={styles.sm}>Arm {measurements.arm ?? "—"}"</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <VerdictExplainer
        visible={explainerOpen}
        verdict={verdict}
        metrics={metrics}
        weeklyDelta={weeklyDelta}
        onClose={() => setExplainerOpen(false)}
      />

      <WeekPlanSheet
        visible={planOpen}
        plan={weekPlan}
        onClose={() => setPlanOpen(false)}
        onStartWorkout={() => {
          setPlanOpen(false);
          setPlayerOpen(true);
        }}
      />
      {todayPlan ? (
        <TodayPlanSheet
          visible={todayPlanOpen}
          plan={todayPlan}
          onClose={() => setTodayPlanOpen(false)}
          onStartWorkout={() => {
            setTodayPlanOpen(false);
            setPlayerOpen(true);
          }}
        />
      ) : null}
      {recommendedWorkout ? (
        <WorkoutPlayer
          visible={playerOpen}
          workout={recommendedWorkout}
          restCue={restCue}
          onClose={() => setPlayerOpen(false)}
          onComplete={(summary) => {
            setPlayerOpen(false);
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
          }}
          onBackHome={() => void confirmWorkoutComplete()}
          isSaving={completeSaving}
          errorMessage={completeError}
        />
      ) : null}

      <WeeklyCheckinScreen
        visible={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        onComplete={(newVerdict) => {
          setCheckinOpen(false);
          setRevealVerdict(newVerdict);
        }}
      />
      {revealVerdict ? (
        <VerdictRevealScreen
          verdict={revealVerdict}
          onSeeChanges={() => {
            setRevealVerdict(null);
            setExplainerOpen(true);
          }}
          onBackHome={() => setRevealVerdict(null)}
        />
      ) : null}
    </View>
  );
}

function sparklinePath(series: number[]): string {
  if (series.length < 2) return "M2,14 L118,14";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = 116 / (series.length - 1);
  return series
    .map((v, i) => {
      const x = 2 + i * stepX;
      const y = 24 - ((v - min) / span) * 20;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Start of the current week (Sunday) as a YYYY-MM-DD string. */
function startOfWeekIso(now: Date): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The "still gathering" verdict view-model. Until the first weekly check-in, the
 * API returns a status + message but no verdict object. This shapes those REAL
 * values into the card's built-in `no_data` empty state. No metrics are
 * fabricated: the rings hide for `no_data` and the body weight stays real.
 */
function gatheringVerdict(message: string | null, now: Date): WeeklyVerdict {
  return {
    id: "gathering",
    userId: "",
    weekOf: startOfWeekIso(now),
    checkinId: null,
    source: "cron_no_data",
    engineVersion: "n/a",
    copyVersion: null,
    explanation: null,
    status: "no_data",
    score: null,
    estimatedLeanMassRisk: null,
    nextActionCode: "log_checkin",
    headline: "Your first verdict is almost ready.",
    message: message ?? "Log this week's check-in to see whether you're keeping your muscle.",
    explanationFactors: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Container: pulls Home data from context and resolves loading / error / empty. */
export function HomeScreen() {
  const data = useLeanientData();
  const now = useRef(new Date()).current;
  const profile = data.profile;

  // First load before any profile is cached: spinner, or a full error with retry.
  if (!profile) {
    return (
      <View style={[styles.root, styles.center]}>
        <ScreenGround />
        {data.homeError && !data.isLoading ? (
          <ErrorState onRetry={() => void data.refreshHomeData()} />
        ) : (
          <ActivityIndicator color={colors.emerald} />
        )}
      </View>
    );
  }

  // No verdict yet (still gathering) renders the card's built-in empty state.
  const verdict = data.latestVerdict ?? gatheringVerdict(data.latestVerdictMessage, now);

  return (
    <HomeView
      verdict={verdict}
      profile={profile}
      weightLogs={data.weightLogs}
      medication={data.medicationProtocol ?? undefined}
      focus={data.todaysFocus}
      recommendedWorkouts={data.recommendedWorkouts}
      todayLog={toTodayLog(data.todaysMeals, data.todaysWorkouts)}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: "center", justifyContent: "center" },
  safe: { flex: 1 },
  scroll: { paddingBottom: 120 },
  // app bar
  appbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  wm: { fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.36, color: colors.ink },
  wtog: { flexDirection: "row", gap: 3, padding: 4, borderRadius: 12, backgroundColor: "#E9EAE4" },
  wtogItem: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 9 },
  wtogOn: { backgroundColor: "#fff", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, shadowOpacity: 0.25, elevation: 2 },
  wtogText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  wtogTextOn: { color: colors.ink },
  // rings
  rings: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  // why link
  whylinkWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 2 },
  whylink: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, textDecorationLine: "underline" },
  // focus
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted },
  // dose
  med: { marginHorizontal: 20, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16 },
  mk: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.33, color: colors.faint },
  mv: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginTop: 1 },
  mdiv: { width: 1, height: 26, backgroundColor: colors.line },
  mlogWrap: { marginLeft: "auto" },
  mlog: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  // snap
  snap: { paddingHorizontal: 20, paddingTop: 18 },
  snaprow: { flexDirection: "row", gap: 10, marginTop: 10 },
  sc: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 12, height: 96, justifyContent: "space-between" },
  scAdd: { alignItems: "center", justifyContent: "center", gap: 7, borderStyle: "dashed", borderColor: colors.faintest },
  scAddText: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 14, color: colors.muted, textAlign: "center" },
  sk: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.42, color: colors.faint },
  svRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  sv: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.32, color: colors.ink },
  du: { fontFamily: font.semibold, fontSize: 11, color: colors.emeraldDeep },
  sm: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  // logged today
  loggedList: { gap: 9, marginTop: 10 },
  loggedRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  loggedIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  loggedName: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  loggedVal: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  loggedEmpty: { fontFamily: font.medium, fontSize: 13, color: colors.muted, paddingVertical: 8 },
});

export default HomeScreen;
