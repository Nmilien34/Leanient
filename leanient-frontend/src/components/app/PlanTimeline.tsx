import React, { useState, type ReactNode } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const NODE = 34;

export interface PlanStep {
  key: string;
  icon: ReactNode;
  /** Amber node tint (e.g. the shot-aware "steady" stop). */
  amber?: boolean;
  title: string;
  sub: string;
  /** Complete: node becomes a checkmark and the trail out of it fills emerald. */
  done: boolean;
  /** A string renders as the muted metric (e.g. "72%"); an element renders as-is. */
  trailing?: ReactNode;
  /** Direct, non-expanding action (e.g. start a workout). */
  onPress?: () => void;
  /** Presence makes the step expandable into this content. */
  expandedContent?: ReactNode;
  /** Marks this as the day's priority lever — gets a "TODAY'S FOCUS" eyebrow. */
  focus?: boolean;
}

const checkMark = (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.5l5 5 9-11" />
  </Svg>
);

/** Accented expand affordance — an emerald pill so a collapsed step reads as tappable. */
function Chevron({ open }: { open: boolean }) {
  return (
    <View style={[styles.chevBtn, open && styles.chevBtnOpen]}>
      <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      </View>
    </View>
  );
}

/** One stop on the plan timeline: a rail (connecting line + node) plus the action. */
function StepRow({
  step,
  isFirst,
  isLast,
  prevDone,
  expanded,
  onToggle,
}: {
  step: PlanStep;
  isFirst: boolean;
  isLast: boolean;
  /** Whether the step above this one is complete (colors the incoming trail). */
  prevDone: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const expandable = step.expandedContent !== undefined;
  // The rail line leaves the bottom of this node whenever something follows it —
  // the next step, or this step's own expanded panel.
  const showBottom = !isLast || (expandable && expanded);
  const trailing = typeof step.trailing === "string" ? <Text style={styles.trailingPct}>{step.trailing}</Text> : step.trailing;

  const header = (
    <View style={styles.row}>
      <View style={styles.rail}>
        {isFirst ? null : <View style={[styles.line, styles.lineTop, prevDone && styles.lineDone]} />}
        {showBottom ? <View style={[styles.line, styles.lineBottom, step.done && styles.lineDone]} /> : null}
        <View style={[styles.node, step.done ? styles.nodeDone : step.amber ? styles.nodeAmber : null]}>{step.done ? checkMark : step.icon}</View>
      </View>
      <View style={styles.body}>
        {step.focus && !step.done ? <Text style={styles.focusEyebrow}>TODAY'S FOCUS</Text> : null}
        <Text style={[styles.rowTitle, step.done ? styles.rowTitleDone : null]}>{step.title}</Text>
        <Text style={styles.rowSub}>{step.sub}</Text>
      </View>
      <View style={styles.trailing}>
        {!step.done && trailing ? trailing : null}
        {expandable ? <Chevron open={expanded} /> : !step.done && step.onPress ? <Text style={styles.chev}>›</Text> : null}
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
          <View style={styles.railSpacer}>{isLast ? null : <View style={[styles.line, styles.lineFull, step.done && styles.lineDone]} />}</View>
          <View style={styles.panel}>{step.expandedContent}</View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The shared "journey" rail used by the Today and This-week plan cards: each
 * stop is a node linked by a connecting line, completed stops become green
 * checks and light their outgoing trail, and a stop with `expandedContent`
 * opens inline with the rail running through it. One stop opens at a time.
 */
export function PlanTimeline({ steps }: { steps: PlanStep[] }) {
  // Open the first not-yet-done expandable stop on mount, so its detail is right
  // there grabbing attention instead of hidden behind a chevron the user might miss.
  const [openKey, setOpenKey] = useState<string | null>(
    () => steps.find((s) => s.expandedContent !== undefined && !s.done)?.key ?? null,
  );
  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpenKey((k) => (k === key ? null : key));
  };

  return (
    <>
      {steps.map((step, i) => (
        <StepRow
          key={step.key}
          step={step}
          isFirst={i === 0}
          isLast={i === steps.length - 1}
          prevDone={i > 0 && steps[i - 1].done}
          expanded={openKey === step.key}
          onToggle={() => toggle(step.key)}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  rowPressed: { opacity: 0.55 },
  rail: { width: NODE, alignItems: "center", justifyContent: "center", position: "relative" },
  line: { position: "absolute", width: 2, left: (NODE - 2) / 2, backgroundColor: "#D7E2DA" },
  lineTop: { top: 0, height: "50%" },
  lineBottom: { top: "50%", bottom: 0 },
  lineFull: { top: 0, bottom: 0 },
  lineDone: { backgroundColor: colors.emerald },
  node: { width: NODE, height: NODE, borderRadius: 11, backgroundColor: "#E7F4EC", alignItems: "center", justifyContent: "center" },
  nodeAmber: { backgroundColor: "#F7ECDB" },
  nodeDone: { backgroundColor: colors.emerald },
  body: { flex: 1, paddingVertical: 11, justifyContent: "center" },
  focusEyebrow: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 0.7, color: colors.emeraldDeep, marginBottom: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.15 },
  rowTitleDone: { color: colors.faint, textDecorationLine: "line-through" },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "center" },
  trailingPct: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  chev: { fontFamily: font.semibold, fontSize: 19, color: colors.faint },
  chevBtn: { width: 27, height: 27, borderRadius: 14, backgroundColor: "rgba(47,184,122,0.12)", alignItems: "center", justifyContent: "center" },
  chevBtnOpen: { backgroundColor: "rgba(47,184,122,0.20)" },
  expandRow: { flexDirection: "row", gap: 12 },
  railSpacer: { width: NODE, alignItems: "center", position: "relative" },
  panel: { flex: 1, paddingBottom: 12, paddingTop: 2 },
});

export default PlanTimeline;
