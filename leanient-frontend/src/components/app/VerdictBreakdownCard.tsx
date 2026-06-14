import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VerdictBreakdown } from "../../screens/app/verdictBreakdown";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface VerdictBreakdownCardProps {
  view: VerdictBreakdown;
  /** Opens the full explainer prose. */
  onPress?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.emeraldDeep;
  if (score >= 60) return colors.ink;
  return colors.amberDeep;
}

/**
 * Quantifies the weekly verdict: the composite muscle-retention score, its move
 * since last week, and the three component scores (protein, training, pace) so a
 * glance shows which lever is leaking. Tapping opens the prose explainer.
 */
export function VerdictBreakdownCard({ view, onPress }: VerdictBreakdownCardProps) {
  const deltaLabel =
    view.retentionDelta == null
      ? null
      : view.retentionDelta === 0
        ? "no change"
        : `${view.retentionDelta > 0 ? "up" : "down"} ${Math.abs(view.retentionDelta)} this week`;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Muscle retention score ${view.retention} out of 100`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>MUSCLE RETENTION</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{view.retention}</Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
        </View>
        {deltaLabel ? (
          <Text style={[styles.delta, view.retentionDelta != null && view.retentionDelta < 0 ? styles.deltaDown : null]}>
            {deltaLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.components}>
        {view.components.map((c) => (
          <View key={c.key} style={styles.comp}>
            <Text style={[styles.compScore, { color: scoreColor(c.score) }]}>{c.score}</Text>
            <Text style={styles.compLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {view.weakestLine ? (
        <Text style={styles.weak}>{view.weakestLine}</Text>
      ) : (
        <Text style={styles.weak}>All three levers are strong. Hold the pattern.</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.emeraldDeep },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  score: { fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.9, color: colors.ink },
  scoreMax: { fontFamily: font.semibold, fontSize: 14, color: colors.faint },
  delta: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep, marginTop: 4 },
  deltaDown: { color: colors.amberDeep },
  components: { flexDirection: "row", gap: 8, marginTop: 14 },
  comp: { flex: 1, backgroundColor: colors.paper, borderRadius: 12, paddingVertical: 9, alignItems: "center", gap: 3 },
  compScore: { fontFamily: font.extrabold, fontSize: 18 },
  compLabel: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  weak: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 13, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default VerdictBreakdownCard;
