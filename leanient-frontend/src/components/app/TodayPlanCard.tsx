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

function DoneBadge() {
  return (
    <View style={styles.doneBadge}>
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l5 5 9-11" />
      </Svg>
    </View>
  );
}

/** A plan row that is either a checked, done item or a tappable next action. */
function ActionRow({ icon, amber, title, sub, done, trailing, onPress }: { icon: ReactNode; amber?: boolean; title: string; sub: string; done: boolean; trailing?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.icon, amber ? styles.iconAmber : null]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, done ? styles.rowTitleDone : null]}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {done ? <DoneBadge /> : trailing ? <Text style={styles.trailing}>{trailing}</Text> : <Text style={styles.chev}>›</Text>}
    </Pressable>
  );
}

/**
 * Today's plan as a daily checklist that drives the core loop: see what to do,
 * do it, log it. Eat and move are tappable actions that show a check once done;
 * the shot-aware steady note stays informational. Header opens the full sheet.
 */
export function TodayPlanCard({ plan, eatDone, moveDone, onEat, onMove, onDetail }: TodayPlanCardProps) {
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole={onDetail ? "button" : undefined} accessibilityLabel="Today's plan details" onPress={onDetail} style={styles.head}>
        <Text style={styles.eyebrow}>TODAY'S PLAN</Text>
        {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
      </Pressable>

      <ActionRow
        icon={ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>)}
        title="Eat to your protein"
        sub={plan.eat.subline}
        done={eatDone}
        trailing={`${plan.eat.pct}%`}
        onPress={onEat}
      />

      {plan.move ? (
        <ActionRow
          icon={ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>)}
          title={`${plan.move.title} · ${plan.move.duration}`}
          sub={plan.move.subline}
          done={moveDone}
          onPress={onMove}
        />
      ) : null}

      {plan.steady ? (
        <View style={styles.row}>
          <View style={[styles.icon, styles.iconAmber]}>{ic(<><Path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" /></>, colors.amberDeep)}</View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{`${plan.steady.shotLabel} · ${plan.steady.title}`}</Text>
            <Text style={styles.rowSub}>{plan.steady.subline}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.coach}>{plan.coachLine}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  flex: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  detail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  rowPressed: { opacity: 0.55 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(47,184,122,0.12)", alignItems: "center", justifyContent: "center" },
  iconAmber: { backgroundColor: "rgba(227,166,94,0.16)" },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.15 },
  rowTitleDone: { color: colors.faint, textDecorationLine: "line-through" },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
  trailing: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  chev: { fontFamily: font.semibold, fontSize: 19, color: colors.faint },
  doneBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  coach: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default TodayPlanCard;
