import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "./LineChart";
import type { StrengthTrend, StrengthTrendView } from "../../screens/app/strengthTrend";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface StrengthTrendCardProps {
  view: StrengthTrendView;
}

const TREND_COLOR: Record<StrengthTrend, { line: string; text: string }> = {
  climbing: { line: colors.emerald, text: colors.emeraldDeep },
  holding: { line: colors.emerald, text: colors.emeraldDeep },
  lighter: { line: colors.amber, text: colors.amberDeep },
  building: { line: colors.emerald, text: colors.emeraldDeep },
};

const TREND_WORD: Record<StrengthTrend, string> = {
  climbing: "Climbing",
  holding: "Holding",
  lighter: "Lighter",
  building: "Building",
};

/**
 * Compact half-width strength card: the trend word, a sparkline of weekly training
 * volume (or session frequency when no load is logged), and this week's sessions.
 * The behavioral proof of the resistance lever; pairs beside the weight card.
 */
export function StrengthTrendCard({ view }: StrengthTrendCardProps) {
  const c = TREND_COLOR[view.trend];
  const points = view.series.map((value) => ({ value }));
  const hasSpark = view.series.filter((v) => v > 0).length >= 2;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>STRENGTH</Text>

      <Text style={[styles.word, { color: c.text }]}>{TREND_WORD[view.trend]}</Text>
      <Text style={styles.sub}>
        {view.sessions} {view.sessions === 1 ? "session" : "sessions"} · 6 wk
      </Text>

      {hasSpark ? (
        <View style={styles.spark}>
          <LineChart points={points} height={34} stroke={c.line} />
        </View>
      ) : null}

      <Text style={styles.week}>
        <Text style={[styles.weekNum, { color: c.text }]}>{view.sessionsThisWeek}</Text> this week
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  eyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.74, color: colors.muted },
  word: { fontFamily: font.extrabold, fontSize: 23, letterSpacing: -0.4, marginTop: 8 },
  sub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 3 },
  spark: { marginTop: 10 },
  week: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 9 },
  weekNum: { fontFamily: font.extrabold, fontSize: 13 },
});

export default StrengthTrendCard;
