import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { CountUpText } from "../ui/CountUpText";
import type { DoseProteinInsight } from "../../screens/app/doseProteinInsight";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface DoseProteinCardProps {
  insight: DoseProteinInsight;
}

/**
 * Connects the dose to the muscle story: how protein adherence moved since the
 * last dose increase. A drop is the appetite shift that puts muscle at risk; a
 * hold is the win worth naming. Amber when it slipped, emerald when it held.
 */
export function DoseProteinCard({ insight }: DoseProteinCardProps) {
  const dropped = insight.direction === "dropped";
  const accent = dropped ? colors.amberDeep : colors.emeraldDeep;
  const tint = dropped ? "rgba(227,166,94,0.13)" : "rgba(47,184,122,0.12)";

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
          </Svg>
        </View>
        <Text style={[styles.headline, { color: accent }]}>{insight.headline}</Text>
      </View>

      <View style={styles.compareRow}>
        <View style={styles.stat}>
          <CountUpText value={insight.beforePct} suffix="%" style={styles.statPct} />
          <Text style={styles.statLabel}>before</Text>
        </View>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
        <View style={styles.stat}>
          <CountUpText value={insight.afterPct} suffix="%" style={[styles.statPct, { color: accent }]} />
          <Text style={styles.statLabel}>since {insight.toDose} {insight.doseUnit}</Text>
        </View>
      </View>

      <Text style={styles.body}>{insight.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headline: { fontFamily: font.bold, fontSize: 14.5, letterSpacing: -0.15, flexShrink: 1 },
  compareRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 14 },
  stat: { alignItems: "center", minWidth: 78 },
  statPct: { fontFamily: font.extrabold, fontSize: 24, letterSpacing: -0.6, color: colors.ink },
  statLabel: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  body: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});

export default DoseProteinCard;
