import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { MuscleRetentionLabel } from "@leanient/shared";
import { useNavigation } from "@react-navigation/native";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { UserAvatar } from "../../components/app/UserAvatar";
import { LineChart, type ChartPoint } from "../../components/app/LineChart";
import { AddPhotoThumb, ProgressPhotoThumb } from "../../components/app/ProgressPhotoThumb";
import { SkeletonCard } from "../../components/app/LoadingSkeleton";
import { ErrorState } from "../../components/app/ErrorState";
import { EmptyState } from "../../components/app/EmptyState";
import { StallDiagnosticScreen } from "./StallDiagnosticScreen";
import { useAuth } from "../../context/AuthContext";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useQuickActions } from "../../context/QuickActionsContext";
import { resolveSectionState } from "./sectionState";
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
  const [stallOpen, setStallOpen] = useState(false);
  const now = new Date();

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
  }, [auth.user?.id, data.refreshProgress]);

  // Header
  const weeksOnMed =
    overview?.summary.weeksOnProtocol ??
    (medication ? Math.max(1, Math.floor(daysSince(medication.startDate, now) / 7)) : null);
  const medName = overview?.summary.medicationName ?? medication?.medicationName ?? null;

  // Section data + states (retention + weight come from the combined home fetch).
  const snapshots = overview?.chart.snapshots ?? [];
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
  const photos = data.progressPhotos.slice().sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1));
  const photosState = resolveSectionState({
    hasData: photos.length > 0,
    isLoading: data.isLoading || data.isRefreshing,
    hasError: !!data.progressPhotosError,
  });

  // Weight chart values
  const weightValues = weightLogs.map((w) => w.value);
  const unit = weightLogs[weightLogs.length - 1]?.unit ?? profile?.goalWeightUnit ?? "lb";
  const startWeight = weightValues[0] ?? 0;
  const todayWeight = weightValues[weightValues.length - 1] ?? 0;
  const lost = Math.max(0, startWeight - todayWeight);
  const weightPoints: ChartPoint[] = weightValues.map((v) => ({ value: v }));

  // Muscle retention chart points
  const retentionPoints: ChartPoint[] = snapshots.map((s) => ({
    value: s.muscleRetentionScore,
    color: RETENTION_COLOR[s.retentionLabel],
  }));

  const weekOf = (captureDate: string) =>
    medication
      ? Math.max(1, Math.floor((daysSince(medication.startDate, now) - daysSince(captureDate, now)) / 7) + 1)
      : null;

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
                <Text style={styles.cval}>{overview ? RETENTION_TEXT[overview.chart.currentLabel] : ""}</Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <LineChart points={retentionPoints} height={92} stroke={colors.emerald} showDots showBaseline />
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisLabel}>Wk 1</Text>
                <Text style={styles.axisLabel}>Wk {Math.ceil(snapshots.length / 2)}</Text>
                <Text style={styles.axisLabel}>Wk {snapshots.length}</Text>
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
                  {profile?.goalWeight ?? todayWeight} {unit} goal
                </Text>
              </View>
            </View>
          )}

          {/* coach prompt */}
          <View style={styles.aiWrap}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ask the coach" onPress={() => setStallOpen(true)}>
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

      <StallDiagnosticScreen visible={stallOpen} onClose={() => setStallOpen(false)} />
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
