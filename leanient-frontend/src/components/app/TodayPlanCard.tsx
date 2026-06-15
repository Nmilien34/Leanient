import React, { useState, type ReactNode } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { EatSuggestion, TodayPlan } from "../../screens/app/todayPlanMetrics";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

interface PlanStep {
  key: string;
  icon: ReactNode;
  amber?: boolean;
  title: string;
  sub: string;
  done: boolean;
  trailing?: string;
  onPress?: () => void;
  expandedContent?: ReactNode;
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

function Chevron({ open }: { open: boolean }) {
  return (
    <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9l6 6 6-6" />
      </Svg>
    </View>
  );
}

/** One stop on the plan timeline: a rail (connecting line + node) plus the action. */
function StepRow({
  step,
  isFirst,
  isLast,
  expanded,
  onToggle,
}: {
  step: PlanStep;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const expandable = step.expandedContent !== undefined;
  // The rail line leaves the bottom of this node whenever something follows it —
  // the next step, or this step's own expanded panel.
  const showBottom = !isLast || (expandable && expanded);

  const header = (
    <View style={styles.row}>
      <View style={styles.rail}>
        {isFirst ? null : <View style={[styles.line, styles.lineTop]} />}
        {showBottom ? <View style={[styles.line, styles.lineBottom]} /> : null}
        <View style={[styles.node, step.amber ? styles.nodeAmber : null]}>{step.icon}</View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.rowTitle, step.done ? styles.rowTitleDone : null]}>{step.title}</Text>
        <Text style={styles.rowSub}>{step.sub}</Text>
      </View>
      <View style={styles.trailing}>
        {step.done ? <DoneBadge /> : step.trailing ? <Text style={styles.trailingPct}>{step.trailing}</Text> : null}
        {expandable ? <Chevron open={expanded} /> : step.onPress ? <Text style={styles.chev}>›</Text> : null}
      </View>
    </View>
  );

  const onPress = expandable ? onToggle : step.onPress;

  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={expandable ? { expanded } : { checked: step.done }}
          accessibilityLabel={step.title}
          onPress={onPress}
          style={({ pressed }) => [pressed && styles.rowPressed]}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}

      {expandable && expanded ? (
        <View style={styles.expandRow}>
          <View style={styles.railSpacer}>{isLast ? null : <View style={[styles.line, styles.lineFull]} />}</View>
          <View style={styles.panel}>{step.expandedContent}</View>
        </View>
      ) : null}
    </View>
  );
}

/** The expanding "what to eat" panel under the EAT stop. */
function EatPanel({ remaining, suggestions, onScan }: { remaining: number; suggestions: EatSuggestion[]; onScan: () => void }) {
  return (
    <View>
      <Text style={styles.panelGoal}>
        {remaining > 0 ? (
          <>
            <Text style={styles.panelGoalNum}>{remaining}g</Text> protein left today — try one of these:
          </>
        ) : (
          "You're at your protein goal. Anything more is a bonus."
        )}
      </Text>

      {suggestions.map((s) => (
        <View key={s.name} style={styles.sugg}>
          <Text style={styles.suggName}>{s.name}</Text>
          <Text style={styles.suggMacros}>
            <Text style={styles.suggProtein}>{s.protein}g</Text> · {s.calories} cal
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
 * Today's plan as a journey: each stop (eat, move, steady) is linked by a
 * connecting rail so it reads as do this, then that, then this. The EAT stop
 * expands into protein-forward meal ideas and a scan button; move checks off
 * once logged; the shot-aware steady note is the last stop.
 */
export function TodayPlanCard({ plan, eatDone, moveDone, onEat, onMove, onDetail }: TodayPlanCardProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpenKey((k) => (k === key ? null : key));
  };

  const steps: PlanStep[] = [
    {
      key: "eat",
      icon: ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>),
      title: "Eat to your protein",
      sub: plan.eat.subline,
      done: eatDone,
      trailing: `${plan.eat.pct}%`,
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
        <StepRow
          key={step.key}
          step={step}
          isFirst={i === 0}
          isLast={i === steps.length - 1}
          expanded={openKey === step.key}
          onToggle={() => toggle(step.key)}
        />
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
  lineFull: { top: 0, bottom: 0 },
  node: { width: NODE, height: NODE, borderRadius: 11, backgroundColor: "#E7F4EC", alignItems: "center", justifyContent: "center" },
  nodeAmber: { backgroundColor: "#F7ECDB" },
  body: { flex: 1, paddingVertical: 11, justifyContent: "center" },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.15 },
  rowTitleDone: { color: colors.faint, textDecorationLine: "line-through" },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "center" },
  trailingPct: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  chev: { fontFamily: font.semibold, fontSize: 19, color: colors.faint },
  doneBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  expandRow: { flexDirection: "row", gap: 12 },
  railSpacer: { width: NODE, alignItems: "center", position: "relative" },
  panel: { flex: 1, paddingBottom: 12, paddingTop: 2 },
  panelGoal: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginBottom: 8 },
  panelGoalNum: { fontFamily: font.extrabold, color: colors.emeraldDeep },
  sugg: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  suggName: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, flexShrink: 1, paddingRight: 10 },
  suggMacros: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted },
  suggProtein: { fontFamily: font.bold, color: colors.ink },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, height: 44, borderRadius: 22, backgroundColor: colors.emeraldDeep },
  scanBtnPressed: { opacity: 0.85 },
  scanBtnText: { fontFamily: font.semibold, fontSize: 14.5, color: "#F4FBF7", letterSpacing: -0.1 },
  coach: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default TodayPlanCard;
