import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { StallDiagnosticResponse } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ErrorState } from "../../components/app/ErrorState";
import apiService from "../../services/api.service";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

function Statline({ kind, label, value }: { kind: "down" | "flat"; label: string; value: string }) {
  const color = kind === "down" ? colors.amberDeep : colors.muted;
  return (
    <View style={styles.statline}>
      <View style={styles.sli}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          {kind === "down" ? <Path d="M12 5v14M6 13l6 6 6-6" /> : <Path d="M5 12h14" />}
        </Svg>
      </View>
      <Text style={styles.slk}>{label}</Text>
      <Text style={[styles.slv, { color }]}>{value}</Text>
    </View>
  );
}

interface StallDiagnosticScreenProps {
  visible: boolean;
  onClose: () => void;
  onSetFocus?: () => void;
}

/**
 * "Why the scale's stuck" — the stall diagnostic. Renders the deterministic
 * analysis (weight flat days, protein/training trends) plus the coach's
 * explanation + fix, all from `StallDiagnosticResponse`.
 */
export function StallDiagnosticScreen({ visible, onClose, onSetFocus }: StallDiagnosticScreenProps) {
  const [data, setData] = useState<StallDiagnosticResponse | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) {
      setData(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setData(null);
    setError(false);
    apiService
      .getStallDiagnostic()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (!visible) return null;

  const header = (
    <View style={styles.head}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
      <Text style={styles.headTitle}>Why the scale's stuck</Text>
      <View style={styles.closeBtn} />
    </View>
  );

  if (!data) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {header}
          {error ? (
            <View style={styles.center}>
              <ErrorState onRetry={retry} />
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={colors.emerald} />
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  const a = data.deterministicAnalysis;
  const sessionsHit = a.trainingTrend.recentSessionsCount + a.trainingTrend.priorSessionsCount;
  const sessionsTarget = a.trainingTrend.recentSessionsTarget + a.trainingTrend.priorSessionsTarget;
  const headline = data.stalled ? "You're not broken —\nyour inputs slipped." : "You're not stalled — keep going.";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {header}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.coachmark}>
            <View style={styles.coachdot}>
              <Spark />
            </View>
            <Text style={styles.coachLabel}>LEANIENT COACH</Text>
          </View>

          <Text style={styles.h1}>{headline}</Text>
          {data.explanation ? <Text style={styles.prose}>{data.explanation}</Text> : null}

          <View style={styles.stats}>
            <Statline
              kind="down"
              label="Protein average"
              value={`${a.proteinTrend.priorAvgGrams} → ${a.proteinTrend.recentAvgGrams}g`}
            />
            <Statline kind="down" label="Sessions hit" value={`${sessionsHit} of ${sessionsTarget}`} />
            <Statline kind="flat" label="Weight" value={`flat ${a.weightTrend.daysFlat} days`} />
          </View>

          {data.suggestedFix ? (
            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fix}>
              <Text style={styles.eyebrow}>THIS WEEK'S FIX</Text>
              <Text style={styles.fixText}>{data.suggestedFix}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Set this as my focus" onPress={onSetFocus ?? onClose}>
                <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.vbtn}>
                  <Text style={styles.vbtnText}>Set this as my focus</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          ) : null}

          <Text style={styles.disc}>
            Based on your logged behavior — not medical advice. Talk to your prescriber about anything dose-related.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 80 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  h1: { fontFamily: font.extrabold, fontSize: 25, lineHeight: 30, letterSpacing: -0.75, color: colors.ink, paddingHorizontal: 20, paddingTop: 8 },
  prose: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: colors.inkSoft, paddingHorizontal: 20, paddingTop: 13 },
  stats: { paddingHorizontal: 20, paddingTop: 16, gap: 9 },
  statline: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  sli: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  slk: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  slv: { fontFamily: font.bold, fontSize: 13 },
  fix: { marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted },
  fixText: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: colors.ink, marginTop: 8 },
  vbtn: { marginTop: 14, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  vbtnText: { fontFamily: font.semibold, fontSize: 15, color: "#F4FBF7" },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, paddingHorizontal: 20, paddingTop: 14 },
});

export default StallDiagnosticScreen;
