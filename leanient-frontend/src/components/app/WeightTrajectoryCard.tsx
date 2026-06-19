import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LineChart } from "./LineChart";
import type { WeightPace, WeightTrajectoryView } from "../../screens/app/weightTrajectory";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WeightTrajectoryCardProps {
  view: WeightTrajectoryView;
  /** Opens the weight log. */
  onPress?: () => void;
}

const PACE_COLOR: Record<WeightPace, { line: string; text: string; fill: string }> = {
  steady: { line: colors.emerald, text: colors.emeraldDeep, fill: "rgba(47,184,122,0.12)" },
  gentle: { line: colors.emerald, text: colors.emeraldDeep, fill: "rgba(47,184,122,0.12)" },
  holding: { line: colors.emerald, text: colors.emeraldDeep, fill: "rgba(47,184,122,0.12)" },
  fast: { line: colors.amber, text: colors.amberDeep, fill: "rgba(227,166,94,0.16)" },
  unknown: { line: colors.faint, text: colors.muted, fill: "rgba(124,138,130,0.12)" },
};

/**
 * Home weight-trajectory card: the current weight, this week's change framed by
 * the muscle-safe pace band, and a sparkline of recent weigh-ins. Fills the gap
 * where on-protocol users otherwise see no weight trend on Today.
 */
export function WeightTrajectoryCard({ view, onPress }: WeightTrajectoryCardProps) {
  const c = PACE_COLOR[view.pace];
  const down = view.weekDelta != null && view.weekDelta <= 0;
  const points = view.series.map((value) => ({ value }));

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Weight ${view.current} ${view.unit}. ${view.weekDeltaLabel}. ${view.paceLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.head}>
        <Text style={styles.eyebrow}>WEIGHT</Text>
        <Text style={[styles.pace, { color: c.text }]}>{view.paceLabel}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.valRow}>
            <Text style={styles.value}>{view.current.toFixed(1)}</Text>
            <Text style={styles.unit}>{view.unit}</Text>
          </View>
          {view.weekDelta != null ? (
            <View style={[styles.delta, { backgroundColor: c.fill }]}>
              <Text style={[styles.deltaText, { color: c.text }]}>
                {down ? "↓" : "↑"} {Math.abs(view.weekDelta).toFixed(1)} {view.unit} this week
              </Text>
            </View>
          ) : (
            <Text style={styles.noWeigh}>No weigh-in this week</Text>
          )}
        </View>

        {view.series.length >= 2 ? (
          <View style={styles.spark}>
            <LineChart points={points} height={48} stroke={c.line} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  pace: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.1 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 14 },
  left: { flex: 1 },
  valRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  value: { fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  unit: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  delta: { alignSelf: "flex-start", marginTop: 8, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  deltaText: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.1 },
  noWeigh: { fontFamily: font.medium, fontSize: 12, color: colors.faint, marginTop: 8 },
  spark: { width: 132 },
});

export default WeightTrajectoryCard;
