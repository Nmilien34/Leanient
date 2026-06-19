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
 * Home strength-work card: the behavioral proof of the resistance-training lever.
 * Shows the trend word, a short read, and a sparkline of weekly training volume
 * (or session frequency when no load is logged). See buildStrengthTrend.
 */
export function StrengthTrendCard({ view }: StrengthTrendCardProps) {
  const c = TREND_COLOR[view.trend];
  const points = view.series.map((value) => ({ value }));
  const hasSpark = view.series.filter((v) => v > 0).length >= 2;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>STRENGTH WORK</Text>
        <Text style={[styles.trend, { color: c.text }]}>{TREND_WORD[view.trend]}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.headline}>{view.headline}</Text>
          <Text style={styles.sub}>{view.subline}</Text>
          <Text style={styles.week}>
            <Text style={[styles.weekNum, { color: c.text }]}>{view.sessionsThisWeek}</Text> this week
          </Text>
        </View>

        {hasSpark ? (
          <View style={styles.spark}>
            <LineChart points={points} height={48} stroke={c.line} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  trend: { fontFamily: font.bold, fontSize: 12, letterSpacing: -0.1 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 14 },
  left: { flex: 1 },
  headline: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.3, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 3 },
  week: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, marginTop: 9 },
  weekNum: { fontFamily: font.extrabold, fontSize: 13 },
  spark: { width: 120 },
});

export default StrengthTrendCard;
