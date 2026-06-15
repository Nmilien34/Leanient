import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { TodayPlan } from "../../screens/app/todayPlanMetrics";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface TodayPlanCardProps {
  plan: TodayPlan;
  /** Hit the day's protein target. */
  eatDone: boolean;
  /** Logged today's session. */
  moveDone: boolean;
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

interface PlanStep {
  key: string;
  icon: ReactNode;
  amber?: boolean;
  title: string;
  sub: string;
  done: boolean;
  trailing?: string;
  onPress?: () => void;
}

function DoneBadge() {
  return (
    <View style={styles.doneBadge}>
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l5 5 9-11" />
      </Svg>
    </View>
  );
}

/** One stop on the plan timeline: a rail (connecting line + node) plus the action. */
function StepRow({ step, isFirst, isLast }: { step: PlanStep; isFirst: boolean; isLast: boolean }) {
  const rail = (
    <View style={styles.rail}>
      {isFirst ? null : <View style={[styles.line, styles.lineTop]} />}
      {isLast ? null : <View style={[styles.line, styles.lineBottom]} />}
      <View style={[styles.node, step.amber ? styles.nodeAmber : null]}>{step.icon}</View>
    </View>
  );

  const body = (
    <>
      {rail}
      <View style={styles.body}>
        <Text style={[styles.rowTitle, step.done ? styles.rowTitleDone : null]}>{step.title}</Text>
        <Text style={styles.rowSub}>{step.sub}</Text>
      </View>
      {step.done ? <DoneBadge /> : step.trailing ? <Text style={styles.trailing}>{step.trailing}</Text> : step.onPress ? <Text style={styles.chev}>›</Text> : null}
    </>
  );

  if (step.onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ checked: step.done }}
        accessibilityLabel={step.title}
        onPress={step.onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

/**
 * Today's plan as a journey: each stop (eat, move, steady) is linked by a
 * connecting rail so it reads as do this, then that, then this. Eat and move are
 * tappable actions that check off once done; the shot-aware steady note is the
 * last stop. Header opens the full sheet.
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
      onPress: onEat,
    },
  ];
  if (plan.move) {
    steps.push({
      key: "move",
      icon: ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>),
      title: `${plan.move.title} · ${plan.move.duration}`,
      sub: plan.move.subline,
      done: moveDone,
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
    });
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole={onDetail ? "button" : undefined} accessibilityLabel="Today's plan details" onPress={onDetail} style={styles.head}>
        <Text style={styles.eyebrow}>TODAY'S PLAN</Text>
        {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
      </Pressable>

      {steps.map((step, i) => (
        <StepRow key={step.key} step={step} isFirst={i === 0} isLast={i === steps.length - 1} />
      ))}

      <Text style={styles.coach}>{plan.coachLine}</Text>
    </View>
  );
}

const NODE = 34;

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  detail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  row: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  rowPressed: { opacity: 0.55 },
  rail: { width: NODE, alignItems: "center", justifyContent: "center", position: "relative" },
  line: { position: "absolute", width: 2, left: (NODE - 2) / 2, backgroundColor: "#D7E2DA" },
  lineTop: { top: 0, height: "50%" },
  lineBottom: { top: "50%", bottom: 0 },
  node: { width: NODE, height: NODE, borderRadius: 11, backgroundColor: "#E7F4EC", alignItems: "center", justifyContent: "center" },
  nodeAmber: { backgroundColor: "#F7ECDB" },
  body: { flex: 1, paddingVertical: 11, justifyContent: "center" },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.15 },
  rowTitleDone: { color: colors.faint, textDecorationLine: "line-through" },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
  trailing: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep, alignSelf: "center" },
  chev: { fontFamily: font.semibold, fontSize: 19, color: colors.faint, alignSelf: "center" },
  doneBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  coach: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default TodayPlanCard;
