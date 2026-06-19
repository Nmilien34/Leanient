import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { EatSuggestion, TodayPlan } from "../../screens/app/todayPlanMetrics";
import { PlanTimeline, type PlanStep } from "./PlanTimeline";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface TodayPlanCardProps {
  plan: TodayPlan;
  /** Hit the day's protein target. */
  eatDone: boolean;
  /** Logged today's session. */
  moveDone: boolean;
  /** Opens the meal scan. */
  onEat: () => void;
  onMove: () => void;
  /** Opens the full plan sheet. */
  onDetail?: () => void;
}

const ic = (children: ReactNode, color: string = colors.emeraldDeep) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

/** The expanding "what to eat" panel under the EAT stop. */
function EatPanel({ remaining, suggestions, onScan }: { remaining: number; suggestions: EatSuggestion[]; onScan: () => void }) {
  return (
    <View>
      <Text style={styles.panelGoal}>
        {remaining > 0 ? (
          <>
            <Text style={styles.panelGoalNum}>{remaining}g</Text> protein left today. A few ideas — swap for whatever you've got:
          </>
        ) : (
          "You're at your protein goal. Anything more is a bonus."
        )}
      </Text>

      {suggestions.map((s) => (
        <View key={s.name} style={styles.sugg}>
          <View style={styles.suggDot} />
          <Text style={styles.suggName}>{s.name}</Text>
          <Text style={styles.suggMacros}>
            <Text style={styles.suggProtein}>~{s.protein}g</Text> · ~{s.calories} cal
          </Text>
        </View>
      ))}

      <Pressable accessibilityRole="button" accessibilityLabel="Scan a meal" onPress={onScan} style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}>
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#F4FBF7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9V7a2 2 0 0 1 2-2h2M17 5h2a2 2 0 0 1 2 2v2M21 15v2a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-2" />
          <Path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
        </Svg>
        <Text style={styles.scanBtnText}>Scan a meal</Text>
      </Pressable>
    </View>
  );
}

/**
 * Today's plan as a journey (see PlanTimeline): the EAT stop expands into
 * protein-forward meal ideas and a scan button, move checks off once a session
 * is logged, and the shot-aware steady note is the last stop.
 */
export function TodayPlanCard({ plan, eatDone, moveDone, onEat, onMove, onDetail }: TodayPlanCardProps) {
  const steps: PlanStep[] = [
    {
      key: "eat",
      icon: ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>),
      title: "Eat to your protein",
      sub: plan.eat.subline,
      done: eatDone,
      trailing: `${plan.eat.pct}%`,
      focus: plan.focus === "protein",
      expandedContent: <EatPanel remaining={plan.eat.remaining} suggestions={plan.eat.suggestions} onScan={onEat} />,
    },
  ];
  if (plan.move) {
    steps.push({
      key: "move",
      icon: ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>),
      title: `${plan.move.title} · ${plan.move.duration}`,
      sub: plan.move.subline,
      done: moveDone,
      focus: plan.focus === "training",
      onPress: onMove,
    });
  }
  if (plan.steady) {
    steps.push({
      key: "steady",
      icon: ic(<><Path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" /></>, colors.amberDeep),
      amber: true,
      title: `${plan.steady.shotLabel} · ${plan.steady.title}`,
      sub: plan.steady.subline,
      done: false,
      focus: plan.focus === "pace",
    });
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole={onDetail ? "button" : undefined} accessibilityLabel="Today's plan details" onPress={onDetail} style={styles.head}>
        <Text style={styles.eyebrow}>TODAY'S PLAN</Text>
        {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
      </Pressable>

      <PlanTimeline steps={steps} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  detail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  panelGoal: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginBottom: 8 },
  panelGoalNum: { fontFamily: font.extrabold, color: colors.emeraldDeep },
  sugg: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  suggDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#BFD6C7", marginRight: 9 },
  suggName: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkSoft, flex: 1, paddingRight: 10 },
  suggMacros: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted },
  suggProtein: { fontFamily: font.bold, color: colors.ink },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, height: 44, borderRadius: 22, backgroundColor: colors.emeraldDeep },
  scanBtnPressed: { opacity: 0.85 },
  scanBtnText: { fontFamily: font.semibold, fontSize: 14.5, color: "#F4FBF7", letterSpacing: -0.1 },
  coach: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default TodayPlanCard;
