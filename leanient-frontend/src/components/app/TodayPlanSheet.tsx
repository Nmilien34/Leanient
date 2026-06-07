import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { ModalSafeArea } from "../layout/ModalSafeArea";
import { UserAvatar } from "./UserAvatar";
import type { TodayPlan } from "../../screens/app/todayPlanMetrics";

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

function Dumbbell() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
      <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
    </Svg>
  );
}

function Droplet() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />
    </Svg>
  );
}

interface TodayPlanSheetProps {
  visible: boolean;
  plan: TodayPlan;
  onClose: () => void;
  /** Pending the workout player (screen 19); dismisses for now. */
  onStartWorkout?: () => void;
}

/**
 * "Today's plan" — the three daily moves (EAT / MOVE / STEADY), all driven by
 * `TodayPlan`. Opens from the Home "Today" hero's "See today's plan" action.
 */
export function TodayPlanSheet({ visible, plan, onClose, onStartWorkout }: TodayPlanSheetProps) {
  const { eat, move, steady } = plan;

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
            <Text style={styles.headTitle}>Today's plan</Text>
            <UserAvatar size={34} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.h1}>Make today count.</Text>
            <Text style={styles.sub}>{plan.subtitle}</Text>

            {/* EAT */}
            <View style={styles.pillar}>
              <Text style={styles.eyebrow}>EAT · {eat.target}g PROTEIN</Text>
              <View style={styles.frow}>
                <LinearGradient colors={["#6FE0A6", "#23A869"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                  <Fork />
                </LinearGradient>
                <View style={styles.flex}>
                  <Text style={styles.ftitle}>
                    {eat.logged} of {eat.target}g so far
                  </Text>
                  <Text style={styles.fsub}>{eat.subline}</Text>
                </View>
              </View>
              <View style={styles.bar}>
                <LinearGradient colors={["#2FB87A", "#1F9E63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.max(3, eat.pct)}%` }]} />
              </View>
            </View>

            {/* MOVE */}
            {move ? (
              <View style={styles.pillar}>
                <View style={styles.eyebrowRow}>
                  <Text style={styles.eyebrow}>MOVE · TODAY'S SESSION</Text>
                  <Text style={styles.eyebrowVal}>{move.duration}</Text>
                </View>
                <View style={styles.frow}>
                  <LinearGradient colors={["#6FE0A6", "#23A869"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                    <Dumbbell />
                  </LinearGradient>
                  <View style={styles.flex}>
                    <Text style={styles.ftitle}>{move.title}</Text>
                    <Text style={styles.fsub}>{move.subline}</Text>
                  </View>
                </View>
                {move.tags.length ? (
                  <View style={styles.tags}>
                    {move.tags.map((t) => (
                      <View key={t} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* STEADY */}
            {steady ? (
              <View style={styles.pillar}>
                <View style={styles.eyebrowRow}>
                  <Text style={styles.eyebrow}>STEADY · SHOT CYCLE</Text>
                  <Text style={styles.eyebrowVal}>{steady.shotLabel}</Text>
                </View>
                <View style={styles.frow}>
                  <LinearGradient colors={["#9AC8E0", "#5E93B6"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
                    <Droplet />
                  </LinearGradient>
                  <View style={styles.flex}>
                    <Text style={styles.ftitle}>{steady.title}</Text>
                    <Text style={styles.fsub}>{steady.subline}</Text>
                  </View>
                </View>
              </View>
            ) : null}

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
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tag: { backgroundColor: "rgba(47,184,122,0.10)", borderRadius: 9, paddingVertical: 5, paddingHorizontal: 10 },
  tagText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.emeraldDeep },
  aicard: { marginTop: 14, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 16 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  dismiss: { alignItems: "center", paddingVertical: 14 },
  dismissText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

export default TodayPlanSheet;
