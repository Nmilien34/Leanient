import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { TodayPlan } from "../../screens/app/todayPlanMetrics";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface TodayPlanCardProps {
  plan: TodayPlan;
  /** Opens the full plan sheet for the detail. */
  onPress?: () => void;
}

function Row({ icon, amber, title, sub, trailing }: { icon: ReactNode; amber?: boolean; title: string; sub: string; trailing?: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, amber ? styles.iconAmber : null]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const ic = (children: ReactNode, color: string = colors.emeraldDeep) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

/**
 * The day's plan, inline on Home so it isn't hidden behind a tap: eat to your
 * protein, the recommended session, and the shot-aware "steady" note. Each row
 * is what to do plus why. Tapping opens the full plan sheet.
 */
export function TodayPlanCard({ plan, onPress }: TodayPlanCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel="Today's plan"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <Text style={styles.eyebrow}>TODAY'S PLAN</Text>

      <Row
        icon={ic(<><Path d="M4 3v6a2.5 2.5 0 0 0 5 0V3M6.5 3v14M14.5 3c-1.6 1.5-2 4-2 6h2v8" /></>)}
        title="Eat to your protein"
        sub={plan.eat.subline}
        trailing={`${plan.eat.pct}%`}
      />

      {plan.move ? (
        <Row
          icon={ic(<><Path d="M7 5v12M15 5v12M3.5 8v6M18.5 8v6M7 11h8" /></>)}
          title={`${plan.move.title} · ${plan.move.duration}`}
          sub={plan.move.subline}
        />
      ) : null}

      {plan.steady ? (
        <Row
          icon={ic(<><Path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" /></>, colors.amberDeep)}
          amber
          title={`${plan.steady.shotLabel} · ${plan.steady.title}`}
          sub={plan.steady.subline}
        />
      ) : null}

      <Text style={styles.coach}>{plan.coachLine}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(47,184,122,0.12)", alignItems: "center", justifyContent: "center" },
  iconAmber: { backgroundColor: "rgba(227,166,94,0.16)" },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.15 },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
  trailing: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  coach: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default TodayPlanCard;
