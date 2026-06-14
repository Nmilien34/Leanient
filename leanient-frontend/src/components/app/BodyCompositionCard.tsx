import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { BodyCompositionView } from "../../screens/app/bodyComp";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface BodyCompositionCardProps {
  view: BodyCompositionView;
  /** Opens the breakdown / explainer. */
  onPress?: () => void;
}

/**
 * Home hero that makes the muscle-loss estimate quantitative: of the weight
 * lost, how much was fat (the goal) vs lean mass (the thing to protect), with a
 * split bar and a one-line comparison to the unmanaged GLP-1 average.
 */
export function BodyCompositionCard({ view, onPress }: BodyCompositionCardProps) {
  const fatWidth = `${Math.max(2, Math.min(98, view.fatPct))}%` as const;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Body composition: ${view.headline}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.eyebrowRow}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 12h3l2 5 4-13 2 8h4" />
        </Svg>
        <Text style={styles.eyebrow}>BODY COMPOSITION</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.total}>{view.totalLostLb} lb</Text>
        <Text style={styles.totalSub}>{view.context}</Text>
      </View>

      <View style={styles.bar}>
        <View style={[styles.barFat, { width: fatWidth }]} />
        <View style={styles.barMuscle} />
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.emerald }]} />
          <Text style={styles.legendText}>
            Fat <Text style={styles.legendVal}>{view.fatLostLb} lb</Text>
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.honey }]} />
          <Text style={styles.legendText}>
            Muscle <Text style={styles.legendVal}>{view.muscleLostLb} lb</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.story}>
        <Text style={styles.storyLead}>{view.headline}</Text> {view.comparison}
      </Text>
      <Text style={styles.disc}>Estimated from your protein, training, and loss pace.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.emeraldDeep },
  totalRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 },
  total: { fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.9, color: colors.ink },
  totalSub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, flexShrink: 1 },
  bar: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", marginTop: 14, backgroundColor: colors.honey },
  barFat: { backgroundColor: colors.emerald, height: 14 },
  barMuscle: { flex: 1, height: 14 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  legendVal: { fontFamily: font.bold, color: colors.ink },
  story: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 13, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  storyLead: { fontFamily: font.bold, color: colors.ink },
  disc: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 8 },
});

export default BodyCompositionCard;
