import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { WeekPlan, WeekPlanSession } from "../../screens/app/weekPlanMetrics";
import { PlanTimeline, type PlanStep } from "./PlanTimeline";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WeekPlanCardProps {
  plan: WeekPlan;
  /** Opens the meal scan. */
  onLogMeal: () => void;
  onStartWorkout: () => void;
  /** Opens the full week-plan sheet. */
  onDetail?: () => void;
}

const ic = (children: ReactNode, color: string = colors.emeraldDeep) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const STATUS_STYLE: Record<WeekPlanSession["status"], { color: string; bg: string }> = {
  done: { color: colors.emeraldDeep, bg: "rgba(47,184,122,0.12)" },
  today: { color: colors.emeraldDeep, bg: "rgba(47,184,122,0.12)" },
  upcoming: { color: colors.muted, bg: "rgba(86,97,89,0.10)" },
};

/** Small status pill, reused for the pace stop and each weekly session. */
function StatusChip({ label, status }: { label: string; status: WeekPlanSession["status"] }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.chipText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

/** The expanding session list under the TRAIN stop. */
function SessionsPanel({ sessions, allDone, onStart }: { sessions: WeekPlanSession[]; allDone: boolean; onStart: () => void }) {
  return (
    <View>
      {sessions.map((s, i) => (
        <View key={`${s.title}-${i}`} style={styles.sess}>
          <Text style={[styles.sessName, s.status === "upcoming" ? styles.sessNameDim : null]} numberOfLines={1}>
            {s.title}
            {s.detail ? <Text style={styles.sessDetail}>{`  ${s.detail}`}</Text> : null}
          </Text>
          <StatusChip label={s.statusLabel} status={s.status} />
        </View>
      ))}

      {allDone ? (
        <Text style={styles.allDone}>Every session in this week. That's the muscle work done.</Text>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Start a session" onPress={onStart} style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#F4FBF7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8 5v14l11-7z" />
          </Svg>
          <Text style={styles.startBtnText}>Start a session</Text>
        </Pressable>
      )}
    </View>
  );
}

const PACE_STATUS: Record<string, WeekPlanSession["status"]> = { "On track": "today", Stalled: "upcoming", "Too fast": "upcoming" };

/**
 * This week's plan as the same journey as Today (see PlanTimeline): protein and
 * training are the two moves that keep muscle — training expands into the weekly
 * sessions — and pace is the steady note that lands on your goal date.
 */
export function WeekPlanCard({ plan, onLogMeal, onStartWorkout, onDetail }: WeekPlanCardProps) {
  const trainingDone = plan.training.done >= plan.training.target && plan.training.target > 0;

  const steps: PlanStep[] = [
    {
      key: "protein",
      icon: ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>),
      title: "Eat to your protein",
      sub: plan.protein.subline,
      done: plan.protein.pct >= 100,
      trailing: `${plan.protein.pct}%`,
      focus: plan.focus === "protein",
      onPress: onLogMeal,
    },
    {
      key: "train",
      icon: ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>),
      title: "Train to keep muscle",
      sub: `${plan.training.done} of ${plan.training.target} sessions done`,
      done: trainingDone,
      trailing: `${plan.training.done}/${plan.training.target}`,
      focus: plan.focus === "training",
      expandedContent: <SessionsPanel sessions={plan.training.sessions} allDone={trainingDone} onStart={onStartWorkout} />,
    },
    {
      key: "pace",
      icon: ic(<><Path d="M4 19V5M4 19h16M7 14l4-4 3 2 5-6" /></>),
      title: plan.pace.headline,
      sub: plan.pace.subline,
      done: false,
      trailing: <StatusChip label={plan.pace.statusLabel} status={PACE_STATUS[plan.pace.statusLabel] ?? "upcoming"} />,
      focus: plan.focus === "pace",
    },
  ];
  // Lead with last week's leaking lever so the most important move is first.
  const focusKey = plan.focus === "training" ? "train" : plan.focus;
  const ordered = focusKey ? [steps.find((s) => s.key === focusKey)!, ...steps.filter((s) => s.key !== focusKey)] : steps;

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole={onDetail ? "button" : undefined} accessibilityLabel="This week's plan details" onPress={onDetail} style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>THIS WEEK'S PLAN</Text>
          <Text style={styles.range}>{plan.weekRangeLabel}</Text>
        </View>
        {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
      </Pressable>

      {plan.recap ? <Text style={styles.recap}>{plan.recap}</Text> : null}

      <PlanTimeline steps={ordered} />

      <View style={styles.payoff}>
        <View style={styles.payoffIcon}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 21V5a2 2 0 0 1 2-2h11l-2.5 4L18 11H7" />
          </Svg>
        </View>
        <View style={styles.payoffBody}>
          <Text style={styles.payoffLabel}>BY SUNDAY</Text>
          <Text style={styles.payoffText}>{plan.payoff}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  range: { fontFamily: font.medium, fontSize: 12, color: colors.faint, marginTop: 2 },
  recap: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, backgroundColor: colors.sageFill, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 6, marginTop: 2 },
  detail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11 },
  chipText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.1 },
  sess: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, gap: 10 },
  sessName: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, flex: 1 },
  sessNameDim: { fontFamily: font.medium, color: colors.muted },
  sessDetail: { fontFamily: font.regular, fontSize: 12, color: colors.faint },
  allDone: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.emeraldDeep, marginTop: 8 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, height: 44, borderRadius: 22, backgroundColor: colors.emeraldDeep },
  startBtnPressed: { opacity: 0.85 },
  startBtnText: { fontFamily: font.semibold, fontSize: 14.5, color: "#F4FBF7", letterSpacing: -0.1 },
  payoff: { flexDirection: "row", gap: 11, alignItems: "center", marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  payoffIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  payoffBody: { flex: 1 },
  payoffLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.7, color: colors.emeraldDeep, marginBottom: 2 },
  payoffText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.ink, letterSpacing: -0.1 },
});

export default WeekPlanCard;
