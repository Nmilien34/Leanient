import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { ModalSafeArea } from "../layout/ModalSafeArea";
import { UserAvatar } from "./UserAvatar";
import type { SessionStatus, WeekPlan } from "../../screens/app/weekPlanMetrics";

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

function Fork() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 1-3 3-3 6s1 4 3 4v8" />
    </Svg>
  );
}

function Flag() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 21V4M6 4h11l-2 4 2 4H6" />
    </Svg>
  );
}

/** Per-session leading icon — check when done, play today, hollow ring upcoming. */
function SessionIcon({ status }: { status: SessionStatus }) {
  if (status === "done") {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l4 4 10-10" />
      </Svg>
    );
  }
  if (status === "today") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24" fill={colors.emeraldDeep}>
        <Path d="M8 5l11 7-11 7z" />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.faintest} strokeWidth={2}>
      <Circle cx={12} cy={12} r={8} />
    </Svg>
  );
}

interface WeekPlanSheetProps {
  visible: boolean;
  plan: WeekPlan;
  onClose: () => void;
  /** Pending the workout player (screen 19); dismisses for now. */
  onStartWorkout?: () => void;
}

/**
 * "This week's plan" — the three muscle-keeping moves (protein / training /
 * pace), all driven by `WeekPlan`. Opens from the Home verdict card's
 * "See this week's plan" action; slides up over the Home screen.
 */
export function WeekPlanSheet({ visible, plan, onClose, onStartWorkout }: WeekPlanSheetProps) {
  const { protein, training, pace } = plan;
  const builtAround = plan.shotDayName ? ` · built around your ${plan.shotDayName} shot` : "";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
      <StatusBar style="dark" />
      <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.head}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
          <Text style={styles.headTitle}>This week's plan</Text>
          <UserAvatar size={34} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Keep your muscle.{"\n"}Three moves this week.</Text>
          <Text style={styles.sub}>
            {plan.weekRangeLabel}
            {builtAround}
          </Text>

          {/* 1 · Protein */}
          <View style={styles.pillar}>
            <Text style={styles.eyebrow}>1 · PROTEIN · {protein.dailyTarget}g / DAY</Text>
            <View style={styles.frow}>
              <LinearGradient colors={["#6FE0A6", "#23A869"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                <Fork />
              </LinearGradient>
              <View style={styles.flex}>
                <Text style={styles.ftitle}>
                  {protein.logged} of {protein.target}g this week
                </Text>
                <Text style={styles.fsub}>{protein.subline}</Text>
              </View>
            </View>
            <View style={styles.bar}>
              <LinearGradient colors={["#2FB87A", "#1F9E63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.max(3, protein.pct)}%` }]} />
            </View>
          </View>

          {/* 2 · Training */}
          <View style={styles.pillar}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>2 · TRAINING · {training.target} SESSIONS</Text>
              <Text style={styles.eyebrowVal}>
                {training.done} of {training.target} done
              </Text>
            </View>
            <View style={styles.sessions}>
              {training.sessions.map((s, i) => (
                <View key={`${s.title}-${i}`} style={styles.session}>
                  <View style={styles.sessionIcon}>
                    <SessionIcon status={s.status} />
                  </View>
                  <Text style={styles.sessionTitle}>
                    {s.title}
                    {s.detail ? ` · ${s.detail}` : ""}
                  </Text>
                  <Text style={[styles.sessionStatus, s.status === "today" ? styles.sessionToday : styles.sessionMuted]}>
                    {s.statusLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 3 · Pace */}
          <View style={styles.pillar}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>3 · PACE · {pace.lbPerWeek.toFixed(1)} {pace.unit} / WK</Text>
              <Text style={styles.eyebrowVal}>{pace.statusLabel}</Text>
            </View>
            <View style={styles.frow}>
              <LinearGradient colors={["#8FE8B5", "#2FB87A"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                <Flag />
              </LinearGradient>
              <View style={styles.flex}>
                <Text style={styles.ftitle}>{pace.headline}</Text>
                <Text style={styles.fsub}>{pace.subline}</Text>
              </View>
            </View>
          </View>

          {/* coach */}
          <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
            <View style={styles.coachmark}>
              <View style={styles.coachdot}>
                <Spark />
              </View>
              <Text style={styles.coachLabel}>LEANIENT COACH</Text>
            </View>
            <Text style={styles.coachText}>{plan.coachLine}</Text>
          </LinearGradient>

          <Pressable accessibilityRole="button" accessibilityLabel="Start today's workout" onPress={onStartWorkout ?? onClose}>
            <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>Start today's workout</Text>
            </LinearGradient>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="I've got it" onPress={onClose} style={styles.dismiss}>
            <Text style={styles.dismissText}>I've got it</Text>
          </Pressable>
        </ScrollView>
      </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  h1: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 29, letterSpacing: -0.48, color: colors.ink, paddingTop: 8 },
  sub: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, marginTop: 6 },
  // pillar card
  pillar: { marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.muted },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrowVal: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  frow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 10 },
  fic: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  ftitle: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.ink },
  fsub: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 2 },
  bar: { height: 10, borderRadius: 5, backgroundColor: "rgba(222,231,212,0.9)", marginTop: 13, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  // sessions
  sessions: { gap: 9, marginTop: 12 },
  session: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionIcon: { width: 22, alignItems: "center" },
  sessionTitle: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  sessionStatus: { fontFamily: font.bold, fontSize: 13 },
  sessionToday: { color: colors.emeraldDeep },
  sessionMuted: { color: colors.faint },
  // coach
  aicard: { marginTop: 14, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  // cta
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 16 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  dismiss: { alignItems: "center", paddingVertical: 14 },
  dismissText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

export default WeekPlanSheet;
