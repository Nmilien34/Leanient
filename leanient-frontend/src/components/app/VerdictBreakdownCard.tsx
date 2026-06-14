import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CountUpText } from "../ui/CountUpText";
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
  const isDown = view.retentionDelta != null && view.retentionDelta < 0;
  const deltaLabel =
    view.retentionDelta == null
      ? null
      : view.retentionDelta === 0
        ? "no change"
        : `${view.retentionDelta > 0 ? "up" : "down"} ${Math.abs(view.retentionDelta)} this week`;
  // The right-side summary doubles as the "why" button, so it gets a pill +
  // chevron to read as tappable. Falls back to a plain label without onPress.
  const pillLabel = deltaLabel ?? "Why this score";

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Muscle retention score ${view.retention} out of 100`}
      accessibilityHint={onPress ? "Opens the full breakdown of why" : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>MUSCLE RETENTION</Text>
          <View style={styles.scoreRow}>
            <CountUpText value={view.retention} style={styles.score} />
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
        </View>
        {onPress ? (
          <View style={[styles.whyBtn, isDown ? styles.whyBtnAmber : null]}>
            <Text style={[styles.whyText, isDown ? styles.whyTextAmber : null]}>{pillLabel}</Text>
            <Text style={[styles.whyChev, isDown ? styles.whyTextAmber : null]}>›</Text>
          </View>
        ) : deltaLabel ? (
          <Text style={[styles.delta, isDown ? styles.deltaDown : null]}>{deltaLabel}</Text>
        ) : null}
      </View>

      <View style={styles.components}>
        {view.components.map((c) => (
          <View key={c.key} style={styles.comp}>
            <CountUpText value={c.score} style={[styles.compScore, { color: scoreColor(c.score) }]} />
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
  whyBtn: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(47,184,122,0.12)", borderWidth: 1, borderColor: "rgba(47,184,122,0.28)" },
  whyBtnAmber: { backgroundColor: "rgba(227,166,94,0.14)", borderColor: "rgba(227,166,94,0.34)" },
  whyText: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  whyTextAmber: { color: colors.amberDeep },
  whyChev: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep, marginTop: -1 },
  components: { flexDirection: "row", gap: 8, marginTop: 14 },
  comp: { flex: 1, backgroundColor: colors.paper, borderRadius: 12, paddingVertical: 9, alignItems: "center", gap: 3 },
  compScore: { fontFamily: font.extrabold, fontSize: 18 },
  compLabel: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  weak: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 13, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default VerdictBreakdownCard;
