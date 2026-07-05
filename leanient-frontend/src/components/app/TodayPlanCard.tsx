import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { EatSuggestion, PlanChecklistItem, TodayPlan } from "../../screens/app/todayPlanMetrics";
import type { DayMark } from "../../screens/app/consistency";
import { PlanTimeline, type PlanStep } from "./PlanTimeline";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface TodayPlanCardProps {
  plan: TodayPlan;
  /** The day's checkable actions (buildPlanChecklist). */
  checklist: PlanChecklistItem[];
  /** Rolling last-7-days protein marks, for the momentum chip + dots. */
  proteinDots: DayMark[];
  /** Opens the meal scan. */
  onEat: () => void;
  onMove: () => void;
  /** Opens the dose log (shot-day step). */
  onLogShot?: () => void;
  /** Opens the full plan sheet. */
  onDetail?: () => void;
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

/** The expanding "what to eat" panel under the active protein stop. */
export function EatPanel({ remaining, suggestions, onScan }: { remaining: number; suggestions: EatSuggestion[]; onScan: () => void }) {
  return (
    <View>
      <Text style={styles.panelGoal}>
        {remaining > 0 ? (
          <>
            <Text style={styles.panelGoalNum}>{remaining}g</Text> protein left today. A few ideas, swap for whatever you've got:
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
 * Today's plan as a checkable journey (the execution hero): the day's concrete
 * actions check off on the shared timeline, the header carries the forgiving
 * rolling momentum ("X of last 7"), and the footer shows how today rolls into
 * Sunday's verdict.
 */
export function TodayPlanCard({ plan, checklist, proteinDots, onEat, onMove, onLogShot, onDetail }: TodayPlanCardProps) {
  const steps: PlanStep[] = checklist.map((item) => ({
    key: item.key,
    icon: ICONS[item.kind],
    title: item.title,
    sub: item.sub,
    done: item.done,
    focus: item.focus,
    trailing: item.trailingPct != null ? `${item.trailingPct}%` : undefined,
    onPress: item.kind === "session" && !item.done ? onMove : item.kind === "shot" && !item.done ? onLogShot : undefined,
    expandedContent: item.expandsEat ? (
      <EatPanel remaining={plan.eat.remaining} suggestions={plan.eat.suggestions} onScan={onEat} />
    ) : undefined,
  }));

  const doneCount = checklist.filter((i) => i.done).length;
  const daysHit = proteinDots.filter((d) => d === "hit").length;

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole={onDetail ? "button" : undefined} accessibilityLabel="Today's plan details" onPress={onDetail} style={styles.head}>
        <Text style={styles.eyebrow}>TODAY'S PLAN</Text>
        <View style={styles.headRight}>
          <View style={styles.momentum}>
            <Text style={styles.momentumText}>{daysHit} OF LAST 7</Text>
          </View>
          {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
        </View>
      </Pressable>

      <PlanTimeline steps={steps} />

      <View style={styles.payoff}>
        <View style={styles.payoffIcon}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 21V5a2 2 0 0 1 2-2h11l-2.5 4L18 11H7" />
          </Svg>
        </View>
        <View style={styles.payoffBody}>
          <Text style={styles.payoffLabel}>
            {doneCount} OF {checklist.length} DONE · COUNTS TOWARD SUNDAY
          </Text>
          <Text style={styles.payoffText}>{plan.payoff}</Text>
        </View>
        <View style={styles.dots}>
          {proteinDots.map((mark, i) => (
            <View key={i} style={[styles.dot, mark === "hit" && styles.dotHit, mark === "open" && styles.dotOpen]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  momentum: { backgroundColor: "rgba(47,184,122,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  momentumText: { fontFamily: font.extrabold, fontSize: 10.5, letterSpacing: 0.4, color: colors.emeraldDeep },
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
  payoff: { flexDirection: "row", gap: 11, alignItems: "center", marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  payoffIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  payoffBody: { flex: 1 },
  payoffLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.7, color: colors.emeraldDeep, marginBottom: 2 },
  payoffText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.ink, letterSpacing: -0.1 },
  dots: { flexDirection: "row", gap: 4, alignSelf: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sageFill },
  dotHit: { backgroundColor: colors.emerald },
  dotOpen: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.emerald },
});

export default TodayPlanCard;
