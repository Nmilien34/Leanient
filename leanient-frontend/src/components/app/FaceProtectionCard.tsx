import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FaceProtectionSignal } from "../../screens/app/faceProtection";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface FaceProtectionCardProps {
  signal: FaceProtectionSignal;
}

const LABEL_TEXT: Record<FaceProtectionSignal["label"], string> = {
  strong: "Strong",
  fair: "Fair",
  at_risk: "At risk",
};

/**
 * The honest "Ozempic face" answer that works with zero photos: how well the
 * user's habits (protein + loss pace) are protecting facial volume. A behavioral
 * estimate, not a measurement, so the framing says so.
 */
export function FaceProtectionCard({ signal }: FaceProtectionCardProps) {
  const accent = signal.label === "strong" ? colors.emeraldDeep : signal.label === "fair" ? colors.ink : colors.amberDeep;
  const barColor = signal.label === "at_risk" ? colors.honey : colors.emerald;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>FACE &amp; SKIN PROTECTION</Text>
          <Text style={styles.headline}>{signal.headline}</Text>
        </View>
        <Text style={[styles.label, { color: accent }]}>{LABEL_TEXT[signal.label]}</Text>
      </View>

      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.max(3, Math.min(100, signal.score))}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.factors}>
        <View style={styles.factor}>
          <Text style={styles.factorScore}>{signal.proteinScore}</Text>
          <Text style={styles.factorLabel}>Protein</Text>
        </View>
        <View style={styles.factor}>
          <Text style={styles.factorScore}>{signal.paceScore}</Text>
          <Text style={styles.factorLabel}>Loss pace</Text>
        </View>
      </View>

      <Text style={styles.line}>{signal.line}</Text>
      <Text style={styles.disc}>Estimated from your protein and loss pace, not a measurement of your face.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.66, color: colors.emeraldDeep },
  headline: { fontFamily: font.bold, fontSize: 15.5, letterSpacing: -0.2, color: colors.ink, marginTop: 3 },
  label: { fontFamily: font.extrabold, fontSize: 14, letterSpacing: -0.2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.sageFill, marginTop: 13, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  factors: { flexDirection: "row", gap: 22, marginTop: 12 },
  factor: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  factorScore: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink },
  factorLabel: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  line: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 13, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  disc: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 8 },
});

export default FaceProtectionCard;
