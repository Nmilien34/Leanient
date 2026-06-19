import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { CountUpText } from "../ui/CountUpText";
import { LineChart } from "./LineChart";
import type { RetentionBand, RetentionHeroView } from "../../screens/app/retentionHero";
import { bandForScore } from "../../screens/app/retentionHero";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface RetentionHeroProps {
  view: RetentionHeroView;
  /** Opens the "why this score" explainer. */
  onPress?: () => void;
}

const BAND_COLOR: Record<RetentionBand, { ring: string; text: string; fill: string }> = {
  on_track: { ring: colors.emerald, text: colors.emeraldDeep, fill: "rgba(47,184,122,0.12)" },
  drifting: { ring: colors.amber, text: colors.amberDeep, fill: "rgba(227,166,94,0.16)" },
  losing: { ring: "#D8694A", text: "#B14328", fill: "rgba(216,105,74,0.14)" },
};

const R = 46;
const CIRC = 2 * Math.PI * R;

/** The muscle-retention score as a gauge — the glanceable answer to "how am I doing?". */
function Gauge({ score, color }: { score: number; color: string }) {
  const offset = CIRC * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <Svg width={108} height={108} viewBox="0 0 108 108">
      <Circle cx={54} cy={54} r={R} fill="none" stroke={colors.line} strokeWidth={9} />
      <Circle cx={54} cy={54} r={R} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 54 54)" />
      <SvgText x={54} y={52} textAnchor="middle" fontFamily={font.extrabold} fontSize={30} fill={colors.ink}>
        {score}
      </SvgText>
      <SvgText x={54} y={70} textAnchor="middle" fontFamily={font.medium} fontSize={11} fill={colors.muted}>
        / 100
      </SvgText>
    </Svg>
  );
}

/** One lever (protein / training / pace) as a glanceable mini-bar. */
function Lever({ label, score }: { label: string; score: number }) {
  const c = BAND_COLOR[bandForScore(score)];
  return (
    <View style={styles.lever}>
      <View style={styles.leverHead}>
        <Text style={styles.leverLabel}>{label}</Text>
        <Text style={[styles.leverScore, { color: c.text }]}>{score}</Text>
      </View>
      <View style={styles.leverTrack}>
        <View style={[styles.leverFill, { width: `${Math.max(4, Math.min(100, score))}%`, backgroundColor: c.ring }]} />
      </View>
    </View>
  );
}

/**
 * Glanceable Home hero: leads with the muscle-retention gauge + a one-word
 * status and the week-over-week trend, so value reads in a second. The levers
 * and the full "why" are the second layer (tap opens the explainer).
 */
export function RetentionHero({ view, onPress }: RetentionHeroProps) {
  const c = BAND_COLOR[view.band];
  const up = view.retentionDelta != null && view.retentionDelta >= 0;
  const trendPoints = view.trend.map((value) => ({ value }));

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Muscle retention ${view.retention} out of 100, ${view.statusLabel}. Why this score`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Gauge score={view.retention} color={c.ring} />
        <View style={styles.info}>
          <Text style={styles.eyebrow}>MUSCLE RETENTION</Text>
          <Text style={[styles.status, { color: c.text }]}>{view.statusLabel}</Text>
          {view.trend.length >= 2 ? (
            <View style={styles.spark}>
              <LineChart points={trendPoints} height={34} stroke={c.ring} />
            </View>
          ) : null}
          {view.retentionDelta != null ? (
            <View style={[styles.delta, { backgroundColor: up ? "rgba(47,184,122,0.12)" : "rgba(227,166,94,0.16)" }]}>
              <Text style={[styles.deltaText, { color: up ? colors.emeraldDeep : colors.amberDeep }]}>
                {up ? "↑" : "↓"} {Math.abs(view.retentionDelta)} this week
              </Text>
            </View>
          ) : (
            <Text style={styles.firstRead}>Your first read</Text>
          )}
        </View>
      </View>

      <View style={styles.levers}>
        {view.components.map((comp) => (
          <Lever key={comp.key} label={comp.label} score={comp.score} />
        ))}
      </View>

      {onPress ? (
        <View style={styles.whyRow}>
          <Text style={styles.why}>{view.weakestLine ?? "Why this score"}</Text>
          <Text style={styles.whyChev}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 14 }, shadowRadius: 24, shadowOpacity: 0.09, elevation: 4 },
  pressed: { opacity: 0.92 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  info: { flex: 1 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  status: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.4, marginTop: 2 },
  spark: { marginTop: 8, marginRight: 2 },
  delta: { alignSelf: "flex-start", marginTop: 8, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  deltaText: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.1 },
  firstRead: { fontFamily: font.medium, fontSize: 12, color: colors.faint, marginTop: 8 },
  levers: { flexDirection: "row", gap: 12, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13 },
  lever: { flex: 1 },
  leverHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  leverLabel: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  leverScore: { fontFamily: font.extrabold, fontSize: 13 },
  leverTrack: { height: 5, borderRadius: 3, backgroundColor: colors.sageFill, marginTop: 5, overflow: "hidden" },
  leverFill: { height: 5, borderRadius: 3 },
  whyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  why: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  whyChev: { fontFamily: font.semibold, fontSize: 17, color: colors.emeraldDeep },
});

export default RetentionHero;
