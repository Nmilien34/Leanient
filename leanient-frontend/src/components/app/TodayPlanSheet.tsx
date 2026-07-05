import React, { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { ModalSafeArea } from "../layout/ModalSafeArea";
import { UserAvatar } from "./UserAvatar";
import { PlanTimeline, type PlanStep } from "./PlanTimeline";
import { EatPanel } from "./TodayPlanCard";
import type { PlanChecklistItem, TodayPlan } from "../../screens/app/todayPlanMetrics";
import type { DayMark } from "../../screens/app/consistency";

function Spark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

const ic = (children: ReactNode, color: string = colors.emeraldDeep) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const ICONS: Record<PlanChecklistItem["kind"], ReactNode> = {
  protein: ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>),
  session: ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>),
  shot: ic(<><Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" /></>),
};

function CheckSmall() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-11" />
    </Svg>
  );
}

interface TodayPlanSheetProps {
  visible: boolean;
  plan: TodayPlan;
  /** The day's checkable actions (buildPlanChecklist). */
  checklist: PlanChecklistItem[];
  /** Rolling last-7-days protein marks + labels, for the day strip. */
  proteinDots: DayMark[];
  dayLabels: string[];
  onClose: () => void;
  /** Opens the meal scan for the active protein step. */
  onScanMeal?: () => void;
  onStartWorkout?: () => void;
  onLogShot?: () => void;
}

/**
 * "Today's plan" — the day's checkable journey in full: the same checklist as
 * the Home card, the forgiving last-7-days strip, and the line that ties today
 * to Sunday's verdict.
 */
export function TodayPlanSheet({ visible, plan, checklist, proteinDots, dayLabels, onClose, onScanMeal, onStartWorkout, onLogShot }: TodayPlanSheetProps) {
  const steps: PlanStep[] = checklist.map((item) => ({
    key: item.key,
    icon: ICONS[item.kind],
    title: item.title,
    sub: item.sub,
    done: item.done,
    focus: item.focus,
    trailing: item.trailingPct != null ? `${item.trailingPct}%` : undefined,
    onPress: item.kind === "session" && !item.done ? onStartWorkout : item.kind === "shot" && !item.done ? onLogShot : undefined,
    expandedContent: item.expandsEat ? (
      <EatPanel remaining={plan.eat.remaining} suggestions={plan.eat.suggestions} onScan={onScanMeal ?? onClose} />
    ) : undefined,
  }));
  const doneCount = checklist.filter((i) => i.done).length;
  const daysHit = proteinDots.filter((d) => d === "hit").length;

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

            {/* the checklist journey */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.eyebrow}>TODAY</Text>
                <Text style={styles.eyebrowVal}>
                  {doneCount} of {checklist.length} done
                </Text>
              </View>
              <PlanTimeline steps={steps} />
            </View>

            {/* the forgiving rolling week */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.eyebrow}>LAST 7 DAYS · PROTEIN</Text>
                <Text style={styles.eyebrowVal}>{daysHit} of 7</Text>
              </View>
              <View style={styles.strip}>
                {proteinDots.map((mark, i) => (
                  <View key={i} style={styles.stripDay}>
                    <View style={[styles.stripDot, mark === "hit" && styles.stripDotHit, mark === "open" && styles.stripDotOpen]}>
                      {mark === "hit" ? <CheckSmall /> : null}
                    </View>
                    <Text style={[styles.stripLabel, mark === "open" && styles.stripLabelToday]}>{dayLabels[i]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* the coach's line + how today counts */}
            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.coachText}>{plan.coachLine}</Text>
              <Text style={styles.verdictLine}>Every checked day counts toward Sunday's verdict.</Text>
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
  card: { marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.84, color: colors.muted },
  eyebrowVal: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  strip: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  stripDay: { alignItems: "center", gap: 6, flex: 1 },
  stripDot: { width: 26, height: 26, borderRadius: 9, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  stripDotHit: { backgroundColor: colors.emerald },
  stripDotOpen: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.emerald },
  stripLabel: { fontFamily: font.semibold, fontSize: 10, color: colors.faint },
  stripLabelToday: { color: colors.emeraldDeep, fontFamily: font.bold },
  aicard: { marginTop: 14, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  coachText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 10 },
  verdictLine: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep, marginTop: 10, borderTopWidth: 1, borderTopColor: "rgba(47,184,122,0.2)", paddingTop: 10 },
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 16 },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
  dismiss: { alignItems: "center", paddingVertical: 14 },
  dismissText: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

export default TodayPlanSheet;
