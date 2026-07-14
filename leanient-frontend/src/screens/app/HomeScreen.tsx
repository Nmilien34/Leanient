import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import type {
  DoseLog,
  SubscriptionStatus,
  TodaysFocusResponse,
  UserMedicationProtocol,
  UserProfile,
  WeeklyVerdict,
  WeightLog,
  Workout,
} from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { StaggeredReveal } from "../../components/layout/StaggeredReveal";
import { VerdictCard } from "../../components/app/VerdictCard";
import { MetricRing, TrendTile, InfoTile } from "../../components/app/MetricRing";
import { BodyCompositionCard } from "../../components/app/BodyCompositionCard";
import { VerdictBreakdownCard } from "../../components/app/VerdictBreakdownCard";
import { RetentionHero } from "../../components/app/RetentionHero";
import { GettingStartedCard } from "../../components/app/GettingStartedCard";
import { FirstJourneyCard } from "../../components/app/FirstJourneyCard";
import { HomeStateBanner } from "../../components/app/HomeStateBanner";
import { MorningRead } from "../../components/app/MorningRead";
import { CycleHero } from "../../components/app/CycleHero";
import { PlanFooter, PlanHeader, TaskCard } from "../../components/app/TaskCards";
import { WeekPlanCard } from "../../components/app/WeekPlanCard";
import { DoseProteinCard } from "../../components/app/DoseProteinCard";
import { CoachInsightCard } from "../../components/app/CoachInsightCard";
import { QuickActionRow } from "../../components/app/QuickActionRow";
import { WeightTrajectoryCard } from "../../components/app/WeightTrajectoryCard";
import { StrengthTrendCard } from "../../components/app/StrengthTrendCard";
import { ProgressPhotosCard } from "../../components/app/ProgressPhotosCard";
import { VerdictExplainer } from "../../components/app/VerdictExplainer";
import { SourcesScreen } from "./SourcesScreen";
import { WeekPlanSheet } from "../../components/app/WeekPlanSheet";
import { TodayPlanSheet } from "../../components/app/TodayPlanSheet";
import { WorkoutPlayer } from "../../components/app/WorkoutPlayer";
import { WorkoutCompleteSheet, type WorkoutFeel } from "../../components/app/WorkoutCompleteSheet";
import { UserAvatar } from "../../components/app/UserAvatar";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { useAuth } from "../../context/AuthContext";
import { ErrorState } from "../../components/app/ErrorState";
import { WeeklyCheckinScreen } from "./WeeklyCheckinScreen";
import { VerdictRevealScreen } from "./VerdictRevealScreen";
import { deriveHomeMetrics } from "./homeMetrics";
import { createOpenProgressPhotoAction } from "./homeActions";
import { computeShotCycle, restCueForEnergy } from "./todayMetrics";
import { siteLabel } from "./doseLogForm";
import { DoseHistoryScreen } from "./DoseHistoryScreen";
import { DoseDetailScreen } from "./DoseDetailScreen";
import { MealDetailScreen } from "./MealDetailScreen";
import { TargetsScreen } from "./TargetsScreen";
import { MedicationScreen } from "./MedicationScreen";
import { CoachChatScreen } from "./CoachChatScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { WhatChangedScreen } from "./WhatChangedScreen";
import { formatDoseAmount, formatDoseRelative, sortRecentDoses } from "./doseHistory";
import { deriveTodayView, toTodayLog, type ShotEnergy, type TodayLog } from "./todayMetrics";
import { buildBodyComposition } from "./bodyComp";
import { buildVerdictBreakdown } from "./verdictBreakdown";
import { buildRetentionHero } from "./retentionHero";
import { buildDailyInsight } from "./dailyInsight";
import { buildWeeklyInsight } from "./weeklyInsight";
import { buildWeightTrajectory } from "./weightTrajectory";
import { buildStrengthTrend } from "./strengthTrend";
import { buildDoseProteinInsight } from "./doseProteinInsight";
import { buildGettingStarted, type GettingStartedKey } from "./gettingStarted";
import { buildFirstJourney } from "./firstJourney";
import { resolveHomeLayout, daysSinceLatest, type HomeSection } from "./homeLayout";
import { deriveWeekPlan } from "./weekPlanMetrics";
import { buildPlanChecklist, deriveTodayPlan, pickWorkout, type DayFocus } from "./todayPlanMetrics";
import {
  deriveCyclePersonality,
  deriveLiftPattern,
  derivePersonalPattern,
  greetingForHour,
  morningPill,
  proteinLoggedYesterday,
  weeksSteadyFromDoses,
  PLAN_LABELS,
} from "./cyclePersonality";
import { buildWalkCard, buildWaterCard, buildWeighInCard, orderForReset, toTaskCards } from "./homeTaskCards";
import { buildWeekMap } from "./weekMap";
import { WeekMapCard } from "../../components/app/WeekMapCard";
import { OneTapMealSheet } from "../../components/app/OneTapMealSheet";
import { buildOneTapMeals, type OneTapMeal } from "./oneTapMeals";
import { UndoToast } from "../../components/app/UndoToast";
import { StickyPlanChip } from "../../components/app/StickyPlanChip";
import { ForTodayShelf } from "../../components/app/ForTodayShelf";
import { pickReadsForToday } from "./libraryContent";
import { coachOpener, pickCommunityQuestions } from "./communityQuestions";
import { computeStreak, loadStreakStore, nextBadge, recordDayWon, type StreakStore } from "./streak";
import { DayWonSheet } from "../../components/app/DayWonSheet";
import { StreakScreen } from "../../components/app/StreakScreen";
import { buildMedals } from "./medals";
import { loadMicroDone, setMicroDone } from "./microToday";
import { suggestNextSite } from "./doseLogForm";
import { loadWaterToday, saveWaterToday } from "./waterToday";
import { buildRollingConsistency } from "./consistency";
import { loadSessionStarts, unfinishedStartFor, type SessionStart } from "./sessionStarts";
import { buildExecutionReport } from "./executionReport";
import { buildGuidedWorkoutLogDraft, deriveWorkoutComplete } from "./workoutCompleteMetrics";
import type { CompletedWorkout } from "./workoutSession";
import { extractApiError } from "../../services/apiError";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// How many recent doses to preview on Home before "Show all" opens the history.
const DOSE_PREVIEW_COUNT = 3;

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
  doseLogs: DoseLog[];
  focus: TodaysFocusResponse | null;
  recommendedWorkouts: Workout[];
  todayLog: TodayLog;
}

const SUBSCRIBED_STATUSES: SubscriptionStatus[] = ["trialing", "active", "active_canceled"];

function HomeView({ verdict, profile, weightLogs, medication, doseLogs, recommendedWorkouts, todayLog }: HomeViewProps) {
  const data = useLeanientData();
  const auth = useAuth();
  const navigation = useNavigation();
  const { openQuickLog, openDoseLog, openMealLog, openMealScan, openLogWorkout, openWeightLog, openSideEffectLog, openProgressPhoto, startWorkout } = useQuickActions();
  const now = useRef(new Date()).current;
  const [scope, setScope] = useState<"week" | "today">("today");
  const [doseHistoryOpen, setDoseHistoryOpen] = useState(false);
  const [medScheduleOpen, setMedScheduleOpen] = useState(false);
  const [selectedDose, setSelectedDose] = useState<DoseLog | null>(null);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [whatChangedOpen, setWhatChangedOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [todayPlanOpen, setTodayPlanOpen] = useState(false);
  const [oneTapOpen, setOneTapOpen] = useState(false);
  // Frame 07: sticky plan chip appears once the plan scrolls away.
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const [planEndY, setPlanEndY] = useState<number | null>(null);
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
        doseLogs,
        weekMeals: data.weekMeals,
        sessionsThisWeek: data.trainingToday?.sessionsThisWeek ?? null,
        now,
      }),
    [verdict, profile, weightLogs, medication, doseLogs, data.weekMeals, data.trainingToday?.sessionsThisWeek, now],
  );

  const today = useMemo(
    () => deriveTodayView({ profile, medication, recommendedWorkouts, dailyLog: todayLog, now }),
    [profile, medication, recommendedWorkouts, todayLog, now],
  );

  // Quantified muscle-loss story for the Today hero; null until there's loss to split.
  const bodyComp = useMemo(
    () => buildBodyComposition(data.progressOverview?.summary),
    [data.progressOverview?.summary],
  );

  // The weekly verdict in numbers (retention + protein/training/pace), from the
  // latest snapshot. Null until the first check-in produces one.
  const verdictBreakdown = useMemo(
    () => buildVerdictBreakdown(data.progressOverview?.chart.snapshots ?? []),
    [data.progressOverview?.chart.snapshots],
  );

  // Glanceable Home hero: the retention score as a gauge + trend + levers.
  const retentionHero = useMemo(
    () => buildRetentionHero(data.progressOverview?.chart.snapshots ?? []),
    [data.progressOverview?.chart.snapshots],
  );

  // Coach hand-offs (verdict explainer + daily insight) share one chat mount.
  // The opener seeds the suggestions, gated on subscription.
  const subscribed = auth.user ? SUBSCRIBED_STATUSES.includes(auth.user.subscriptionStatus) : false;
  const [coachSuggestions, setCoachSuggestions] = useState<string[]>([]);
  const openCoachWith = (suggestions: string[]) => {
    setCoachSuggestions(suggestions);
    if (subscribed) setCoachOpen(true);
    else setSubscriptionOpen(true);
  };
  const verdictCoachSuggestions = useMemo<string[]>(() => {
    const out: string[] = [];
    const statusWord =
      verdict.status === "on_track"
        ? "on track"
        : verdict.status === "drifting"
          ? "drifting"
          : verdict.status === "losing_muscle"
            ? "losing muscle"
            : null;
    if (statusWord) out.push(`Why is my muscle verdict "${statusWord}" this week?`);
    const weakest = retentionHero ? [...retentionHero.components].sort((a, b) => a.score - b.score)[0] : null;
    if (weakest) out.push(`How do I improve my ${weakest.label.toLowerCase()}?`);
    out.push("What's the most important thing I can do this week?");
    return out;
  }, [verdict.status, retentionHero]);
  const askCoachAboutVerdict = () => openCoachWith(verdictCoachSuggestions);

  // First-run guide shown in place of the score until the engine has one, so a
  // brand-new user understands why it's empty and what to do about it.
  const gettingStarted = useMemo(
    () =>
      buildGettingStarted({
        hasScore: verdictBreakdown != null,
        weightLogged: weightLogs.length > 0,
        mealLoggedToday: today.loggedMeals.length > 0,
        workoutDoneToday: today.session.done > 0,
        biggestFear: profile.biggestFear,
      }),
    [verdictBreakdown, weightLogs.length, today.loggedMeals.length, today.session.done, profile.biggestFear],
  );

  const handleGettingStartedStep = (key: GettingStartedKey) => {
    if (key === "meal") openMealLog();
    else if (key === "workout") startWorkout();
    else openQuickLog(); // weight lives in the quick-log sheet
  };

  // Cold-start "mirror moment" — only while the new user has no score. Reflects
  // their drug, goal, and fear back so the empty app reads as understood, not blank.
  const firstJourney = useMemo(
    () =>
      gettingStarted
        ? buildFirstJourney({
            medicationName: medication?.medicationName,
            currentWeight: metrics.weight.current,
            goalWeight: profile.goalWeight,
            goalWeightUnit: profile.goalWeightUnit,
            goalPace: profile.goalPace,
            biggestFear: profile.biggestFear,
            now,
          })
        : null,
    [gettingStarted, medication, metrics.weight.current, profile, now],
  );

  // Dynamic Today ordering: arrange the score/verdict/plan trio to match the
  // user's situation (lapsed, shot-day, drifting, thriving) instead of a fixed
  // layout. Null for no-score users — the cold-start cards handle them.
  const daysSinceLastActivity = useMemo(
    () =>
      daysSinceLatest(
        [
          ...weightLogs.map((w) => w.measuredAt),
          ...data.weekMeals.map((m) => m.recordedAt),
          ...data.doseHistory.map((d) => d.recordedAt),
        ],
        now,
      ),
    [weightLogs, data.weekMeals, data.doseHistory, now],
  );
  const homeLayout = useMemo(
    () =>
      resolveHomeLayout({
        hasScore: verdictBreakdown != null,
        retentionDelta: verdictBreakdown?.retentionDelta ?? null,
        daysSinceLastActivity,
        shotContext: medication ? computeShotCycle(medication, now).phase.energy !== "good" : false,
      }),
    [verdictBreakdown, daysSinceLastActivity, medication, now],
  );

  // How protein adherence moved since the last dose increase — the dose's effect
  // on the muscle story. Null until there's a step-up with data on both sides.
  const doseProteinInsight = useMemo(
    () =>
      buildDoseProteinInsight({
        doseLogs: data.doseHistory,
        snapshots: data.progressOverview?.chart.snapshots ?? [],
        now,
      }),
    [data.doseHistory, data.progressOverview?.chart.snapshots, now],
  );

  // Sessions for the weekly plan come straight from the live recommendations.
  const planSessions = recommendedWorkouts;
  const weekPlan = useMemo(
    () =>
      deriveWeekPlan({
        profile,
        verdict,
        medication,
        weightLogs,
        sessions: planSessions,
        lastWeek: verdictBreakdown
          ? {
              retention: verdictBreakdown.retention,
              focus: verdictBreakdown.weakestLine ? (verdictBreakdown.weakest.key as DayFocus) : null,
              focusScore: verdictBreakdown.weakest.score,
            }
          : null,
        now,
      }),
    [profile, verdict, medication, weightLogs, planSessions, verdictBreakdown, now],
  );

  // Today's session + plan adapt to the muscle score: the weakest lever sets the
  // focus, which (with shot energy) picks the right session from the pool. Stable
  // within a day, shifting across days and as the score moves.
  const dayFocus: DayFocus | null = verdictBreakdown?.weakestLine ? (verdictBreakdown.weakest.key as DayFocus) : null;
  const shotCycle = useMemo(() => (medication ? computeShotCycle(medication, now) : null), [medication, now]);
  const shotEnergy: ShotEnergy = shotCycle?.phase.energy ?? "good";
  // The v2 hero speaks in day personalities derived from the cycle position.
  const personality = useMemo(() => (shotCycle ? deriveCyclePersonality(shotCycle) : null), [shotCycle]);
  const daySeed = Math.floor(now.getTime() / 86_400_000);
  const planWorkout = useMemo(
    () => pickWorkout(recommendedWorkouts, { focus: dayFocus, energy: shotEnergy, daySeed }),
    [recommendedWorkouts, dayFocus, shotEnergy, daySeed],
  );
  // The player and completion handler use the same picked session as the plan.
  const recommendedWorkout = planWorkout;
  // Rest cue follows the shot cycle so the player coaches the same shot-aware story.
  const restCue = restCueForEnergy(medication ? computeShotCycle(medication, now).phase.energy : null);
  const todayPlan = useMemo(
    () =>
      planWorkout
        ? deriveTodayPlan({
            profile,
            medication,
            recommendedWorkout: planWorkout,
            retention: verdictBreakdown ? { score: verdictBreakdown.retention, focus: dayFocus } : null,
            dailyLog: todayLog,
            now,
          })
        : null,
    [profile, medication, planWorkout, verdictBreakdown, dayFocus, todayLog, now],
  );

  // The forgiving rolling read: protein days hit + session days over the last
  // 7 days. Feeds the tiles and the plan's momentum chip/dots.
  const consistency = useMemo(
    () =>
      buildRollingConsistency({
        meals: data.recentMeals,
        workouts: data.workoutHistory,
        dailyProteinTarget: profile.dailyProteinTarget,
        weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
        now,
      }),
    [data.recentMeals, data.workoutHistory, profile.dailyProteinTarget, profile.weeklyWorkoutTarget, now],
  );

  // Whether today's dose is already logged (checks the shot-day plan step).
  const doseLoggedToday = useMemo(
    () => doseLogs.some((d) => new Date(d.recordedAt).toDateString() === now.toDateString()),
    [doseLogs, now],
  );

  // The most recent meal, read back to the user in the banked protein step.
  const lastMealName = useMemo(() => {
    const meals = [...data.todaysMeals].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    return meals[0]?.foodName ?? null;
  }, [data.todaysMeals]);

  // Today's started-but-unfinished player session, reloaded when the player
  // closes or a session gets logged, so the checklist reflects it immediately.
  const [sessionStart, setSessionStart] = useState<SessionStart | null>(null);
  useEffect(() => {
    let alive = true;
    void loadSessionStarts().then((map) => {
      if (alive) setSessionStart(unfinishedStartFor(map, now));
    });
    return () => {
      alive = false;
    };
  }, [playerOpen, today.session.done, now]);

  const planChecklist = useMemo(
    () =>
      todayPlan
        ? buildPlanChecklist({
            plan: todayPlan,
            mealsLoggedToday: todayLog.meals.length,
            lastMealName,
            eatDone: today.protein.ratio >= 0.9,
            moveDone: today.session.done > 0,
            sessionStart,
            doseLoggedToday,
          })
        : [],
    [todayPlan, todayLog.meals.length, lastMealName, today.protein.ratio, today.session.done, sessionStart, doseLoggedToday],
  );

  // Morning read: shot day names itself, and the pill leads with the steady
  // streak on shot day, then yesterday's protein, then the journey chip.
  const isShotDay = shotCycle?.daysSinceShot === 0;
  const greeting = greetingForHour(now.getHours(), auth.user?.displayName, isShotDay);
  const readPill = useMemo(() => {
    const firstLog = weightLogs.length
      ? weightLogs.reduce((a, b) => (a.measuredAt < b.measuredAt ? a : b))
      : null;
    const lbLost =
      firstLog && metrics.weight.current != null ? firstLog.value - metrics.weight.current : null;
    return morningPill({
      yesterdayProtein: proteinLoggedYesterday(data.recentMeals, now),
      dayOnMed: shotCycle?.dayOnMed ?? null,
      medicationName: medication?.medicationName,
      isShotDay,
      weeksSteady: weeksSteadyFromDoses(doseLogs, now),
      kind: personality?.kind,
      lbLost,
      retention: retentionHero?.retention ?? null,
    });
  }, [data.recentMeals, now, shotCycle, medication, isShotDay, doseLogs, personality, weightLogs, metrics.weight, retentionHero]);

  // Shot-day water: local 0.5L tap counter, part of winning the reset day.
  const [waterL, setWaterL] = useState(0);
  useEffect(() => {
    let alive = true;
    void loadWaterToday(now).then((liters) => {
      if (alive) setWaterL(liters);
    });
    return () => {
      alive = false;
    };
  }, [now]);
  // Defense-day walk tick (frame 06): local per-day, undo via the toast.
  const [walkDoneAt, setWalkDoneAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMicroDone(now).then((done) => {
      if (alive) setWalkDoneAt(done.walk ?? null);
    });
    return () => {
      alive = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [now]);
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  const tickWalk = () => {
    const at = new Date().toISOString();
    setWalkDoneAt(at);
    void setMicroDone(now, "walk", at);
    const left = displayCards.filter((c) => !c.done && c.key !== "walk").length;
    showToast(left === 0 ? "Walk done. Day won." : left === 1 ? "Walk done. One left today." : `Walk done. ${left} left today.`);
  };
  const undoWalk = () => {
    setWalkDoneAt(null);
    void setMicroDone(now, "walk", null);
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  // Frames 09-10: the streak. Won day = the whole plan checked off.
  const [streakStore, setStreakStore] = useState<StreakStore>({ wonDates: [], longest: 0 });
  const [dayWonOpen, setDayWonOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadStreakStore().then((store) => {
      if (alive) setStreakStore(store);
    });
    return () => {
      alive = false;
    };
  }, []);
  const streakRead = useMemo(() => computeStreak(streakStore, now), [streakStore, now]);
  const medals = useMemo(
    () =>
      buildMedals({
        doseLogs,
        weightLogs,
        snapshotWeeks: (data.progressOverview?.chart.snapshots ?? []).map((snap) => snap.weekOf),
        photoDates: data.progressPhotos.map((photo) => photo.captureDate),
        streak: streakRead,
        now,
      }),
    [doseLogs, weightLogs, data.progressOverview?.chart.snapshots, data.progressPhotos, streakRead, now],
  );

  const addWater = () => {
    const next = Math.min(3, waterL + 0.5);
    setWaterL(next);
    void saveWaterToday(now, next);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // The v2 flat tap-card plan, mapped from the shipped checklist.
  const taskCards = useMemo(
    () =>
      todayPlan && personality
        ? toTaskCards({
            plan: todayPlan,
            checklist: planChecklist,
            personality: personality.kind,
            hour: now.getHours(),
            equipment: planWorkout?.equipment ?? null,
            sessionStarted: Boolean(sessionStart),
            lastMealTime: today.loggedMeals.length
              ? today.loggedMeals[today.loggedMeals.length - 1].timeLabel
              : null,
            doseLabel:
              medication?.doseAmount != null ? `${medication.doseAmount} ${medication.doseUnit}` : null,
            nextSiteLabel: medication
              ? siteLabel(suggestNextSite(sortRecentDoses(doseLogs)[0]?.injectionSite ?? null))
              : null,
          })
        : [],
    [todayPlan, personality, planChecklist, planWorkout, sessionStart, now, today.loggedMeals, medication, doseLogs],
  );

  // Day-personality extras: reset leads with the shot + water micro-card,
  // green light appends the weigh-in (done state follows the real log).
  const displayCards = useMemo(() => {
    if (!personality || !taskCards.length) return taskCards;
    const ordered = orderForReset(taskCards, personality.kind);
    if (personality.kind === "reset") {
      const withWater = [...ordered];
      withWater.splice(1, 0, buildWaterCard(waterL));
      return withWater;
    }
    if (personality.kind === "greenlight") {
      const weighedToday = weightLogs.some(
        (w) => new Date(w.measuredAt).toDateString() === now.toDateString(),
      );
      return [...ordered, buildWeighInCard(weighedToday)];
    }
    if (personality.kind === "defense") {
      return [...ordered, buildWalkCard(walkDoneAt, now)];
    }
    return ordered;
  }, [taskCards, personality, waterL, weightLogs, walkDoneAt, now]);

  // The day-won moment: every card checked and today not yet recorded.
  const todayWonKey = now.toDateString();
  const allCardsDone = displayCards.length > 0 && displayCards.every((c) => c.done);
  useEffect(() => {
    if (!allCardsDone || streakStore.wonDates.includes(todayWonKey)) return;
    void recordDayWon(streakStore, now).then((store) => {
      setStreakStore(store);
      setDayWonOpen(true);
    });
  }, [allCardsDone, streakStore, todayWonKey, now]);

  // Frame-01 hero context: "Thu · Day 46 · Wegovy 1.0 mg". The shot position
  // already lives in the pill and the ribbon, so the line carries the med.
  const heroContext = useMemo(() => {
    if (!shotCycle || !medication) return today.contextLabel;
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    const dose = medication.doseAmount != null ? ` ${medication.doseAmount} ${medication.doseUnit}` : "";
    return `${weekday} · Day ${shotCycle.dayOnMed} · ${medication.medicationName}${dose}`;
  }, [shotCycle, medication, now, today.contextLabel]);

  // YOUR PATTERN speaks from their history once today's cycle position has
  // enough logged days behind it; the cycle truth covers the cold start.
  const heroPersonality = useMemo(() => {
    if (!personality || !shotCycle) return personality;
    // Green-light days speak to training first (their best lift day), the
    // rest read protein history; the cycle truth covers thin history.
    const lift =
      personality.kind === "greenlight"
        ? deriveLiftPattern({
            workouts: data.workoutHistory,
            shotDays: medication?.shotDays ?? null,
            todayDaysSinceShot: shotCycle.daysSinceShot,
          })
        : null;
    return {
      ...personality,
      pattern:
        lift ??
        derivePersonalPattern({
          meals: data.recentMeals,
          dailyProteinTarget: profile.dailyProteinTarget,
          shotDays: medication?.shotDays ?? null,
          todayDaysSinceShot: shotCycle.daysSinceShot,
          now,
          fallback: personality.pattern,
        }),
    };
  }, [personality, shotCycle, data.recentMeals, data.workoutHistory, profile.dailyProteinTarget, medication, now]);

  // The week mapped onto the cycle for the This-week scope (frame 04).
  const weekMapView = useMemo(
    () =>
      buildWeekMap({
        proteinDots: consistency.proteinDots,
        shotDays: medication?.shotDays ?? null,
        now,
      }),
    [consistency.proteinDots, medication, now],
  );

  const contextLabel = useMemo(() => {
    const range = `Week of ${weekRangeLabel(verdict.weekOf)}`;
    if (medication) return `${range} · Day ${daysSince(medication.startDate, now)} on ${medication.medicationName}`;
    return range;
  }, [verdict.weekOf, medication, now]);

  const { protein, training, weight, dose } = metrics;

  // Most-recent-first dose history for the Home dose card. Previews the latest
  // few; the full list lives on the dose history screen.
  const recentDoses = useMemo(() => sortRecentDoses(doseLogs), [doseLogs]);
  const previewDoses = recentDoses.slice(0, DOSE_PREVIEW_COUNT);

  // Today's Focus CTA → the matching logger/screen for its actionType.
  const handleOpenBodyPhoto = useMemo(
    () => createOpenProgressPhotoAction(openProgressPhoto),
    [openProgressPhoto],
  );

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

  const confirmWorkoutComplete = async (feel?: WorkoutFeel) => {
    if (!completed || !recommendedWorkout) return;

    setCompleteSaving(true);
    setCompleteError(null);
    try {
      await data.api.createWorkoutLog(
        buildGuidedWorkoutLogDraft({
          summary: completed,
          workout: recommendedWorkout,
          recordedAt: new Date().toISOString(),
          feel,
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
  // Anchored to the current week; an old delta must never read as "this week".
  const weeklyDelta = weight.weekDelta;
  const weekDeltaLabel =
    weeklyDelta == null
      ? "No weigh-in yet"
      : `${weeklyDelta <= 0 ? "↓" : "↑"} ${Math.abs(weeklyDelta).toFixed(1)} ${weight.unit}`;

  // The week as an execution report card (protein days / sessions / pace) for
  // the This-week verdict block. Pace is fed in lb like the insight below.
  const executionReport = useMemo(
    () =>
      buildExecutionReport({
        weekMeals: data.weekMeals,
        dailyProteinTarget: profile.dailyProteinTarget,
        sessionsThisWeek: data.trainingToday?.sessionsThisWeek ?? training.done,
        weeklyWorkoutTarget: profile.weeklyWorkoutTarget,
        weeklyDeltaLb:
          weeklyDelta == null ? null : weight.unit === "kg" ? weeklyDelta * 2.2046226 : weeklyDelta,
        now,
      }),
    [data.weekMeals, data.trainingToday?.sessionsThisWeek, training.done, profile.dailyProteinTarget, profile.weeklyWorkoutTarget, weeklyDelta, weight.unit, now],
  );

  // One data-driven read from the coach, below the rings (replaces the redundant
  // "do this next" workout prompt — the plan already owns tasks). Pace is fed in
  // lb so the threshold reads the same regardless of the user's unit.
  const dailyInsight = useMemo(
    () =>
      buildDailyInsight({
        verdictStatus: verdict.status,
        retentionDelta: retentionHero?.retentionDelta ?? null,
        levers: retentionHero?.components ?? [],
        weeklyDeltaLb:
          weeklyDelta == null ? null : weight.unit === "kg" ? weeklyDelta * 2.2046226 : weeklyDelta,
        shotContext: shotEnergy !== "good",
      }),
    [verdict.status, retentionHero, weeklyDelta, weight.unit, shotEnergy],
  );
  const askCoachAboutInsight = () => openCoachWith([dailyInsight.chatPrompt, ...verdictCoachSuggestions.slice(0, 1)]);

  // The week-over-week coach read for the This-week tab (this week vs last).
  const weeklyInsight = useMemo(
    () => buildWeeklyInsight(data.progressOverview?.chart.snapshots ?? []),
    [data.progressOverview?.chart.snapshots],
  );
  const askCoachAboutWeek = () =>
    openCoachWith(weeklyInsight ? [weeklyInsight.chatPrompt, ...verdictCoachSuggestions.slice(0, 1)] : verdictCoachSuggestions);

  // Weight trend, framed by the muscle-safe pace band. On-protocol users see the
  // next-shot tile in the rings, so this is their only weight read on Today.
  const weightTrajectory = useMemo(
    () => buildWeightTrajectory({ current: weight.current, unit: weight.unit, series: weight.series, weekDelta: weight.weekDelta }),
    [weight.current, weight.unit, weight.series, weight.weekDelta],
  );

  // Strength work: the behavioral proof of the resistance lever, trended over
  // ~6 weeks from the user's logged sessions (volume when load is logged).
  const strengthTrend = useMemo(() => buildStrengthTrend(data.workoutHistory, now), [data.workoutHistory, now]);

  // Recent body progress photos, mirrored from Progress so visual change shows on
  // Home. Newest first; labelled by week on the protocol (matching Progress).
  const photoItems = useMemo(() => {
    const start = medication?.startDate ? new Date(medication.startDate).getTime() : null;
    return data.progressPhotos
      .filter((p) => p.kind !== "face")
      .slice()
      .sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1))
      .slice(0, 8)
      .map((p) => {
        const wk = start != null ? Math.max(1, Math.floor((new Date(p.captureDate).getTime() - start) / (7 * 86_400_000)) + 1) : null;
        return { id: p.id, uri: p.viewUrl, label: wk != null ? `Wk ${wk}` : "Photo" };
      });
  }, [data.progressPhotos, medication?.startDate]);

  // The reorderable Today "hero trio" — composed into homeLayout.order below.
  const scoreCard = retentionHero ? (
    <RetentionHero view={retentionHero} onPress={() => setExplainerOpen(true)} />
  ) : null;
  const verdictHeroCard = (
    <VerdictCard verdict={verdict} contextLabel={today.contextLabel} override={today.hero} compact />
  );
  // v2 hero: the cycle owns the Today headline whenever a protocol exists; the
  // verdict card stays as the fallback (and still leads the This-week scope).
  const cycleHeroCard =
    heroPersonality && shotCycle && todayPlan ? (
      <CycleHero
        contextLabel={heroContext}
        personality={heroPersonality}
        daysSinceShot={shotCycle.daysSinceShot}
        onPress={() => setTodayPlanOpen(true)}
      />
    ) : null;

  // v2 plan: header + flat tap-cards + footer. Card taps route to the same
  // actions the timeline used (scan / player / dose log).
  // Frame 05: the protein card opens their own meals as one-tap logs.
  const oneTapMeals = useMemo(
    () =>
      buildOneTapMeals({
        recentMeals: data.recentMeals,
        fallback: todayPlan?.eat.suggestions ?? [],
        now,
      }),
    [data.recentMeals, todayPlan, now],
  );
  const logOneTapMeal = async (meal: OneTapMeal) => {
    await data.api.createMealLog({
      foodName: meal.name,
      protein: meal.protein,
      calories: meal.calories,
      source: "manual",
      recordedAt: new Date().toISOString(),
    });
    await data.refreshHomeData();
  };

  const taskCardAction = (kind: string, done: boolean) => {
    if (kind === "water") return done ? undefined : addWater;
    if (kind === "walk") return done ? undefined : tickWalk;
    if (done) return undefined;
    if (kind === "weighin") return openWeightLog;
    if (kind === "protein") return () => setOneTapOpen(true);
    if (kind === "session") return () => startWorkout(planWorkout ?? undefined);
    return openDoseLog;
  };
  const planCard =
    todayPlan && personality && displayCards.length ? (
      <View>
        <PlanHeader
          personalityLabel={PLAN_LABELS[personality.kind]}
          amber={personality.amber}
          momentum={
            personality.kind === "reset"
              ? "SHOT = DAY WON"
              : `${consistency.proteinDots.filter((d) => d === "hit").length} OF LAST 7`
          }
        />
        {displayCards.map((view) => (
          <TaskCard key={view.key} view={view} onPress={taskCardAction(view.kind, view.done)} />
        ))}
        <PlanFooter
          done={displayCards.filter((c) => c.done).length}
          total={displayCards.length}
          dots={consistency.proteinDots}
        />
      </View>
    ) : null;
  const trio: Record<HomeSection, React.ReactNode> = {
    score: scoreCard,
    verdict: cycleHeroCard ?? verdictHeroCard,
    plan: planCard,
  };
  // Shared supporting metrics, rendered below the trio in either layout.
  const ringsCard = (
    <View style={styles.rings}>
      <MetricRing
        ratio={consistency.proteinDaysHit / 7}
        value={`${consistency.proteinDaysHit} of 7`}
        badge={`${today.protein.logged} / ${today.protein.target}g today`}
        label="Protein days"
      />
      <MetricRing
        ratio={consistency.sessionTarget ? Math.min(1, consistency.sessionDays / consistency.sessionTarget) : 0}
        value={`${consistency.sessionDays} of ${consistency.sessionTarget}`}
        badge={today.session.done > 0 ? "Done today" : "0 / 1 today"}
        label="Sessions · 7 days"
      />
      {today.nextShot.onProtocol ? (
        <InfoTile
          icon={
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
            </Svg>
          }
          value={today.nextShot.label}
          badge={today.nextShot.dose}
          label="Next shot"
          accessibilityLabel={`Next shot ${today.nextShot.label}${today.nextShot.dose ? `, ${today.nextShot.dose}` : ""}. Log this dose`}
          onPress={openDoseLog}
        />
      ) : (
        <TrendTile series={weight.series} deltaLabel={weekDeltaLabel} label="This week" />
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          {/* app bar */}
          <View style={styles.appbar}>
            <Text style={styles.wm}>Leanient</Text>
            <View style={styles.wtog}>
              {(["today", "week"] as const).map((k) => (
                <Pressable key={k} onPress={() => setScope(k)} style={[styles.wtogItem, scope === k && styles.wtogOn]}>
                  <Text style={[styles.wtogText, scope === k && styles.wtogTextOn]}>
                    {k === "week" ? "This week" : "Today"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.appbarRight}>
              {streakRead.days > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${streakRead.days} day streak. Open your streak`}
                  onPress={() => setStreakOpen(true)}
                  style={styles.stkChip}
                >
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 21v-8" />
                    <Path d="M12 13c0-4 3-6.5 8-6.5-.8 4.5-3.5 6.5-8 6.5z" />
                    <Path d="M12 13c0-3-2-4.5-5.5-4.5.7 3.5 2.7 4.5 5.5 4.5z" />
                  </Svg>
                  <Text style={styles.stkText}>{streakRead.days}</Text>
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

          {scope === "today" ? (
            /* ---- Today scope: the v2 coach spine (morning read → cycle hero → plan) ---- */
            <>
              <StaggeredReveal index={0}>
                <MorningRead greeting={greeting} pill={readPill} />
              </StaggeredReveal>
              {homeLayout ? (
                (() => {
                  // Scored user — order the hero trio to the situation, metrics after the "why".
                  const items: React.ReactNode[] = [];
                  let idx = 0;
                  if (homeLayout.banner) {
                    items.push(
                      <StaggeredReveal key="banner" index={idx++}>
                        <HomeStateBanner banner={homeLayout.banner} onPress={openQuickLog} />
                      </StaggeredReveal>,
                    );
                  }
                  homeLayout.order.forEach((key) => {
                    if (trio[key]) {
                      items.push(
                        <StaggeredReveal key={key} index={idx++}>
                          {trio[key]}
                        </StaggeredReveal>,
                      );
                    }
                    if (key === "plan") {
                      items.push(
                        <View key="plan-end" onLayout={(e) => setPlanEndY(e.nativeEvent.layout.y)} />,
                      );
                    }
                    // Execution spine: directive → consistency tiles → the plan.
                    if (key === "verdict") {
                      items.push(
                        <StaggeredReveal key="rings" index={idx++}>
                          {ringsCard}
                        </StaggeredReveal>,
                      );
                    }
                  });
                  return items;
                })()
              ) : (
                /* cold start: no score yet — mirror, checklist, then verdict, metrics, plan */
                <>
                  {firstJourney ? (
                    <StaggeredReveal index={0}>
                      <FirstJourneyCard view={firstJourney} />
                    </StaggeredReveal>
                  ) : null}
                  {gettingStarted ? (
                    <StaggeredReveal index={1}>
                      <GettingStartedCard view={gettingStarted} onStep={handleGettingStartedStep} />
                    </StaggeredReveal>
                  ) : null}
                  <StaggeredReveal index={2}>{verdictHeroCard}</StaggeredReveal>
                  <StaggeredReveal index={3}>{ringsCard}</StaggeredReveal>
                  {planCard ? <StaggeredReveal index={4}>{planCard}</StaggeredReveal> : null}
                  <View onLayout={(e) => setPlanEndY(e.nativeEvent.layout.y)} />
                </>
              )}

              {/* The coach's one-line read + fast logging keep the spine actionable. */}
              <StaggeredReveal index={3}>
                <CoachInsightCard insight={dailyInsight} onAsk={askCoachAboutInsight} />
              </StaggeredReveal>

              <StaggeredReveal index={4}>
                <QuickActionRow
                  onLogFood={openMealLog}
                  onLogWorkout={openLogWorkout}
                  onLogWeight={openWeightLog}
                  onLogSideEffect={openSideEffectLog}
                />
              </StaggeredReveal>

              {/* the For-today shelf: library reads picked by cycle day */}
              {heroPersonality && shotCycle ? (
                <StaggeredReveal index={5}>
                  <ForTodayShelf
                    reads={pickReadsForToday(heroPersonality.kind)}
                    dayLabel={shotCycle.daysSinceShot === 0 ? "SHOT DAY" : `DAY ${shotCycle.daysSinceShot}`}
                    amber={heroPersonality.amber}
                  />
                </StaggeredReveal>
              ) : null}

              {/* dose glass row, on Today per frame 07 */}
              {today.nextShot.onProtocol ? (
                <StaggeredReveal index={5}>
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
                    <Pressable accessibilityRole="button" accessibilityLabel="Log dose" onPress={openDoseLog} style={styles.mActions}>
                      <Text style={styles.mlog}>Log dose ›</Text>
                    </Pressable>
                  </View>
                </StaggeredReveal>
              ) : null}

              {/* Everything below is demoted: supporting context, off the spine. */}
              {bodyComp ? (
                <StaggeredReveal index={7}>
                  <BodyCompositionCard view={bodyComp} onPress={() => setExplainerOpen(true)} />
                </StaggeredReveal>
              ) : null}

              {weightTrajectory || strengthTrend ? (
                <StaggeredReveal index={5}>
                  <View style={styles.trendRow}>
                    {weightTrajectory ? <WeightTrajectoryCard view={weightTrajectory} onPress={openQuickLog} /> : null}
                    {strengthTrend ? <StrengthTrendCard view={strengthTrend} /> : null}
                  </View>
                </StaggeredReveal>
              ) : null}

              <StaggeredReveal index={6}>
                <ProgressPhotosCard photos={photoItems} onAdd={openProgressPhoto} />
              </StaggeredReveal>

              <StaggeredReveal index={6}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Adjust today's targets"
                  onPress={() => setTargetsOpen(true)}
                  style={styles.whylinkWrap}
                >
                  <Text style={styles.whylink}>Adjust today's targets</Text>
                </Pressable>
              </StaggeredReveal>

            </>
          ) : (
            /* ---- This week scope ---- */
            <>
              {/* v2 week hero: the gauge and lever bars ARE the recap; the
                  fused verdict block covers gathering/no-score weeks. */}
              {retentionHero ? (
                <StaggeredReveal index={0}>
                  <RetentionHero view={retentionHero} onPress={() => setExplainerOpen(true)} />
                  <View style={[styles.nextWeek, styles.nextWeekStandalone]}>
                    <Text style={styles.nextWeekLabel}>NEXT WEEK</Text>
                    <Text style={styles.nextWeekText}>{executionReport.nextWeek}</Text>
                  </View>
                </StaggeredReveal>
              ) : (
                <StaggeredReveal index={0}>
                  <View style={styles.verdictHero}>
                    <VerdictCard verdict={verdict} contextLabel={contextLabel} onAction={handleVerdictAction} bare />
                    {verdict.status !== "no_data" && verdictBreakdown ? (
                      <>
                        <View style={styles.verdictHeroDivider} />
                        <VerdictBreakdownCard view={verdictBreakdown} report={executionReport} onPress={() => setExplainerOpen(true)} bare />
                        <View style={styles.nextWeek}>
                          <Text style={styles.nextWeekLabel}>NEXT WEEK</Text>
                          <Text style={styles.nextWeekText}>{executionReport.nextWeek}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </StaggeredReveal>
              )}

              {/* cold-start: fill the barren no-data week with the mirror + checklist */}
              {gettingStarted ? (
                <>
                  {firstJourney ? (
                    <StaggeredReveal index={1}>
                      <FirstJourneyCard view={firstJourney} />
                    </StaggeredReveal>
                  ) : null}
                  <StaggeredReveal index={2}>
                    <GettingStartedCard view={gettingStarted} onStep={handleGettingStartedStep} />
                  </StaggeredReveal>
                </>
              ) : null}

              {/* metric rings — the same forgiving days-hit story as the report card
                  above; a perfect Tuesday must never read as a 27% week. */}
              {verdict.status !== "no_data" ? (
                <StaggeredReveal index={2}>
                  <View style={styles.rings}>
                    <MetricRing
                      ratio={executionReport.daysElapsed ? executionReport.proteinDays / executionReport.daysElapsed : 0}
                      value={`${executionReport.proteinDays} of ${executionReport.daysElapsed}`}
                      badge={`${protein.logged} / ${protein.target}g`}
                      label="Protein days"
                    />
                    <MetricRing
                      ratio={training.ratio}
                      value={`${training.done} / ${training.target}`}
                      label="Training"
                    />
                    <TrendTile
                      series={weight.series}
                      deltaLabel={weekDeltaLabel}
                      label="Pace"
                    />
                  </View>
                </StaggeredReveal>
              ) : null}

              {/* the week laid over the cycle: shot / easy / mid / guard */}
              {weekMapView && verdict.status !== "no_data" ? (
                <StaggeredReveal index={3}>
                  <WeekMapCard view={weekMapView} onDetail={() => setPlanOpen(true)} />
                </StaggeredReveal>
              ) : null}

              {/* this week's plan as the same journey as Today */}
              {verdict.status !== "no_data" ? (
                <StaggeredReveal index={3}>
                  <WeekPlanCard
                    plan={weekPlan}
                    onLogMeal={openMealScan}
                    onStartWorkout={() => startWorkout()}
                    onDetail={() => setPlanOpen(true)}
                  />
                </StaggeredReveal>
              ) : null}

              {/* the coach's week-over-week read */}
              {verdict.status !== "no_data" && weeklyInsight ? (
                <StaggeredReveal index={3}>
                  <CoachInsightCard insight={weeklyInsight} onAsk={askCoachAboutWeek} />
                </StaggeredReveal>
              ) : null}

              {/* dose */}
              <StaggeredReveal index={4}>
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
                  <View style={styles.mActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Log dose" onPress={openDoseLog}>
                      <Text style={styles.mlog}>Log dose ›</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit dose schedule"
                      onPress={() => setMedScheduleOpen(true)}
                    >
                      <Text style={styles.medit}>Edit schedule ›</Text>
                    </Pressable>
                  </View>
                </View>
              </StaggeredReveal>

              {/* dose → protein connection (only when there's a recent dose increase to read) */}
              {doseProteinInsight ? (
                <StaggeredReveal index={5}>
                  <DoseProteinCard insight={doseProteinInsight} />
                </StaggeredReveal>
              ) : null}

              {/* dose history — preview the latest few; full list on its own screen */}
              {recentDoses.length > 0 ? (
                <StaggeredReveal index={5}>
                  <View style={styles.doseHist}>
                    <Text style={styles.doseHistTitle}>RECENT DOSES</Text>
                    {previewDoses.map((d) => (
                      <Pressable
                        key={d.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Dose ${formatDoseRelative(d.recordedAt, now)}`}
                        onPress={() => setSelectedDose(d)}
                        style={({ pressed }) => [styles.doseRow, pressed && styles.doseRowPressed]}
                      >
                        <Text style={styles.doseDate}>{formatDoseRelative(d.recordedAt, now)}</Text>
                        <View style={styles.doseRight}>
                          <Text style={styles.doseMeta} numberOfLines={1}>
                            {d.injectionSite ? `${siteLabel(d.injectionSite)} · ` : ""}
                            {formatDoseAmount(d)}
                          </Text>
                          <Text style={styles.doseChev}>›</Text>
                        </View>
                      </Pressable>
                    ))}
                    {recentDoses.length > DOSE_PREVIEW_COUNT ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Show all doses"
                        onPress={() => setDoseHistoryOpen(true)}
                        style={styles.doseMore}
                      >
                        <Text style={styles.doseMoreText}>Show all ({recentDoses.length})</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </StaggeredReveal>
              ) : null}

              {/* this week's body: the cumulative quality-of-loss story + the photo record */}
              {bodyComp ? (
                <StaggeredReveal index={6}>
                  <BodyCompositionCard view={bodyComp} onPress={() => setExplainerOpen(true)} />
                </StaggeredReveal>
              ) : null}

              <StaggeredReveal index={7}>
                <ProgressPhotosCard photos={photoItems} onAdd={handleOpenBodyPhoto} />
              </StaggeredReveal>
            </>
          )}
        </ScrollView>

        <StickyPlanChip
          visible={scope === "today" && planEndY != null && scrollY > planEndY - 60}
          done={displayCards.filter((c) => c.done).length}
          total={displayCards.length}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        />
      </SafeAreaView>

      <UndoToast message={toast} onUndo={undoWalk} />

      <StreakScreen visible={streakOpen} streak={streakRead} medals={medals} onClose={() => setStreakOpen(false)} />

      <DayWonSheet
        visible={dayWonOpen}
        streakDays={streakRead.days}
        weekDots={Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          const key = d.toDateString();
          if (streakStore.wonDates.includes(key)) return "won" as const;
          return key === todayWonKey ? ("open" as const) : ("miss" as const);
        })}
        badge={nextBadge(streakRead.days)}
        isLongestYet={streakRead.days + (nextBadge(streakRead.days)?.remaining ?? 0) > streakRead.longest}
        coachLine={
          personality?.kind === "defense"
            ? `Day ${shotCycle?.daysSinceShot ?? 5} was the hard one, and you took it. Rhythm, not perfection.`
            : personality?.kind === "reset"
              ? "Shot landed, day won. Your week is anchored."
              : personality?.kind === "greenlight"
                ? "Strong day, banked. This is how the muscle stays."
                : personality?.kind === "settling"
                  ? "A quiet day, still won. Those count double."
                  : "Another brick in. Rhythm, not perfection."
        }
        onClose={() => setDayWonOpen(false)}
      />

      <VerdictExplainer
        visible={explainerOpen}
        verdict={verdict}
        metrics={metrics}
        weeklyDelta={weeklyDelta ?? 0}
        onClose={() => setExplainerOpen(false)}
        onAskCoach={askCoachAboutVerdict}
        onSources={() => setSourcesOpen(true)}
      />
      <SourcesScreen visible={sourcesOpen} onClose={() => setSourcesOpen(false)} />

      <CoachChatScreen
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        onUpgrade={() => {
          setCoachOpen(false);
          setSubscriptionOpen(true);
        }}
        suggestions={coachSuggestions}
        opener={
          personality && shotCycle
            ? coachOpener(personality.kind, shotCycle.daysSinceShot, auth.user?.displayName)
            : undefined
        }
        communityQuestions={personality ? pickCommunityQuestions(personality.kind, now) : undefined}
      />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />

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
        <OneTapMealSheet
          visible={oneTapOpen}
          title={displayCards.find((c) => c.kind === "protein" && !c.done)?.title ?? "Next protein meal"}
          remaining={todayPlan.eat.remaining}
          meals={oneTapMeals}
          onLog={logOneTapMeal}
          onScan={openMealScan}
          onType={openMealLog}
          onClose={() => setOneTapOpen(false)}
        />
      ) : null}
      {todayPlan ? (
        <TodayPlanSheet
          visible={todayPlanOpen}
          plan={todayPlan}
          checklist={planChecklist}
          proteinDots={consistency.proteinDots}
          dayLabels={consistency.dayLabels}
          onClose={() => setTodayPlanOpen(false)}
          onScanMeal={() => {
            setTodayPlanOpen(false);
            openMealScan();
          }}
          onStartWorkout={() => {
            setTodayPlanOpen(false);
            setPlayerOpen(true);
          }}
          onLogShot={() => {
            setTodayPlanOpen(false);
            openDoseLog();
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
          onBackHome={(feel) => void confirmWorkoutComplete(feel)}
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
          // Refresh Home so the verdict card + the "See the breakdown" explainer
          // reflect the just-generated verdict, not the prior week's.
          void data.refreshHomeData();
        }}
      />
      {revealVerdict ? (
        <VerdictRevealScreen
          verdict={revealVerdict}
          onSeeChanges={() => {
            setRevealVerdict(null);
            setWhatChangedOpen(true);
          }}
          onBackHome={() => setRevealVerdict(null)}
        />
      ) : null}

      <WhatChangedScreen
        visible={whatChangedOpen}
        snapshots={data.progressOverview?.chart.snapshots ?? []}
        onClose={() => setWhatChangedOpen(false)}
      />

      <DoseHistoryScreen
        visible={doseHistoryOpen}
        doses={recentDoses}
        onClose={() => setDoseHistoryOpen(false)}
        onSelectDose={(d) => setSelectedDose(d)}
      />
      <DoseDetailScreen
        visible={selectedDose !== null}
        dose={selectedDose}
        medicationName={medication?.medicationName}
        onClose={() => setSelectedDose(null)}
      />
      <MedicationScreen visible={medScheduleOpen} startInEdit onClose={() => setMedScheduleOpen(false)} />
      <MealDetailScreen
        visible={selectedMealId !== null}
        meal={data.todaysMeals.find((m) => m.id === selectedMealId) ?? null}
        onClose={() => setSelectedMealId(null)}
      />
      <TargetsScreen visible={targetsOpen} onClose={() => setTargetsOpen(false)} />
    </View>
  );
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
      doseLogs={data.recentDoseLogs}
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
  appbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  stkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(47,184,122,0.12)",
    borderRadius: 11,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  stkText: { fontFamily: font.extrabold, fontSize: 12.5, letterSpacing: -0.13, color: colors.emeraldDeep },
  // rings
  rings: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  trendRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginTop: 12, alignItems: "stretch" },
  verdictHero: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, overflow: "hidden", shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 14 }, shadowRadius: 24, shadowOpacity: 0.09, elevation: 4 },
  verdictHeroDivider: { height: 1, backgroundColor: colors.line, marginHorizontal: 16 },
  nextWeek: { flexDirection: "row", gap: 11, alignItems: "center", marginHorizontal: 16, marginBottom: 16, backgroundColor: "rgba(47,184,122,0.07)", borderWidth: 1, borderColor: "rgba(47,184,122,0.22)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  nextWeekStandalone: { marginHorizontal: 20, marginTop: 12, marginBottom: 0 },
  nextWeekLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.8, color: colors.emeraldDeep },
  nextWeekText: { flex: 1, fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.ink, letterSpacing: -0.1 },
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
  mActions: { marginLeft: "auto", alignItems: "flex-end", gap: 7 },
  mlog: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  medit: { fontFamily: font.semibold, fontSize: 13, color: colors.faint },
  // dose history
  doseHist: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16 },
  doseHistTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.33, color: colors.faint, paddingTop: 8, paddingBottom: 4 },
  doseRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
  doseRowPressed: { opacity: 0.6 },
  doseDate: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  doseRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  doseMeta: { fontFamily: font.medium, fontSize: 13, color: colors.muted, flexShrink: 1, textAlign: "right" },
  doseChev: { fontFamily: font.semibold, fontSize: 17, color: colors.faint },
  doseMore: { paddingVertical: 11, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line },
  doseMoreText: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  // snap
  snap: { paddingHorizontal: 20, paddingTop: 18 },
  snaprow: { flexDirection: "row", gap: 10, marginTop: 10 },
  sc: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 12, height: 96, justifyContent: "space-between" },
  scAdd: { alignItems: "center", justifyContent: "center", gap: 7, borderStyle: "dashed", borderColor: colors.faintest },
  scPressed: { opacity: 0.65 },
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
  loggedChev: { fontFamily: font.bold, fontSize: 15, color: colors.faint, marginLeft: 2 },
  loggedEmpty: { fontFamily: font.medium, fontSize: 13, color: colors.muted, paddingVertical: 8 },
  derivedLine: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 4, paddingBottom: 2 },
});

export default HomeScreen;
