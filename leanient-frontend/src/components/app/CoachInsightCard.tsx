import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { DailyInsight, DailyInsightTone } from "../../screens/app/dailyInsight";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface CoachInsightCardProps {
  insight: DailyInsight;
  /** Opens the coach chat seeded with this insight's follow-up. */
  onAsk?: () => void;
}

const TONE: Record<DailyInsightTone, { tag: string; dot: string; ask: string }> = {
  win: { tag: colors.emeraldDeep, dot: colors.emeraldDeep, ask: colors.emeraldDeep },
  watch: { tag: colors.amberDeep, dot: colors.amberDeep, ask: colors.amberDeep },
  coach: { tag: colors.emeraldDeep, dot: colors.emeraldDeep, ask: colors.emeraldDeep },
};

/** A four-point coach spark, matching the verdict explainer's coach mark. */
function Spark({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

/**
 * Home "coach insight" card: one short, data-driven read from the coach (see
 * buildDailyInsight). Tapping it opens the coach chat in context, so a glance
 * can turn into a conversation.
 */
export function CoachInsightCard({ insight, onAsk }: CoachInsightCardProps) {
  const c = TONE[insight.tone];
  return (
    <Pressable
      accessibilityRole={onAsk ? "button" : undefined}
      accessibilityLabel={`${insight.headline}. Ask your coach`}
      onPress={onAsk}
      style={({ pressed }) => [styles.card, pressed && onAsk ? styles.pressed : null]}
    >
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: c.dot }]}>
          <Spark color="#fff" />
        </View>
        <Text style={[styles.tag, { color: c.tag }]}>{insight.tag}</Text>
        <Text style={styles.from}>FROM YOUR COACH</Text>
      </View>

      <Text style={styles.headline}>{insight.headline}</Text>
      <Text style={styles.body}>{insight.body}</Text>

      {onAsk ? (
        <View style={styles.askRow}>
          <Text style={[styles.ask, { color: c.ask }]}>Ask your coach</Text>
          <Text style={[styles.chev, { color: c.ask }]}>›</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  pressed: { opacity: 0.85 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tag: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77 },
  from: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.7, color: colors.faint, marginLeft: "auto" },
  headline: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.3, color: colors.ink, marginTop: 12 },
  body: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft, marginTop: 5 },
  askRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11 },
  ask: { fontFamily: font.semibold, fontSize: 13 },
  chev: { fontFamily: font.semibold, fontSize: 17 },
});

export default CoachInsightCard;
