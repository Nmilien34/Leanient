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

const PACE_SHORT: Record<WeightPace, string> = {
  steady: "Safe zone",
  gentle: "Gentle pace",
  holding: "Holding",
  fast: "Too quick",
  unknown: "Weigh in",
};

/**
 * Compact half-width weight card: current weight, this week's change, a sparkline,
 * and a one-word pace read against the muscle-safe band. Pairs beside the
 * strength card so the trends band reads in one glance.
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
      <Text style={styles.eyebrow}>WEIGHT</Text>

      <View style={styles.valRow}>
        <Text style={styles.value}>{view.current.toFixed(1)}</Text>
        <Text style={styles.unit}>{view.unit}</Text>
      </View>

      {view.weekDelta != null ? (
        <View style={[styles.delta, { backgroundColor: c.fill }]}>
          <Text style={[styles.deltaText, { color: c.text }]}>
            {down ? "↓" : "↑"} {Math.abs(view.weekDelta).toFixed(1)} {view.unit}
          </Text>
        </View>
      ) : (
        <Text style={styles.noWeigh}>No weigh-in</Text>
      )}

      {view.series.length >= 2 ? (
        <View style={styles.spark}>
          <LineChart points={points} height={34} stroke={c.line} />
        </View>
      ) : null}

      <Text style={[styles.pace, { color: c.text }]}>{PACE_SHORT[view.pace]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  eyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.74, color: colors.muted },
  valRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 8 },
  value: { fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  unit: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  delta: { alignSelf: "flex-start", marginTop: 7, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  deltaText: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: -0.1 },
  noWeigh: { fontFamily: font.medium, fontSize: 11.5, color: colors.faint, marginTop: 7 },
  spark: { marginTop: 10 },
  pace: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.1, marginTop: 9 },
});

export default WeightTrajectoryCard;
