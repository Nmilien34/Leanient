import React, { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { DayReview } from "../../screens/app/dayReview";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface DayReviewCardProps {
  reviews: DayReview[];
}

const SESSION_DOT: Record<DayReview["session"]["state"], string> = {
  done: colors.emerald,
  started: colors.amber,
  none: colors.faintest,
};

function Check() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-11" />
    </Svg>
  );
}

/** One expanded detail line: label left, value right. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/**
 * "Your days" on Progress: each of the last 7 days as what actually happened.
 * Collapsed rows keep the glance light; tapping one expands into protein vs
 * target, the session (with started-but-unfinished named honestly), logged
 * food energy, the estimated session burn, and the day's muscle read.
 */
export function DayReviewCard({ reviews }: DayReviewCardProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpenKey((k) => (k === key ? null : key));
  };

  if (reviews.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>YOUR DAYS · LAST 7</Text>
      {reviews.map((r) => {
        const open = openKey === r.dateKey;
        return (
          <View key={r.dateKey} style={styles.rowWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${r.dayLabel}: ${r.summary}`}
              onPress={() => toggle(r.dateKey)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.mark, r.proteinHit ? styles.markHit : null]}>{r.proteinHit ? <Check /> : null}</View>
              <View style={styles.rowBody}>
                <Text style={styles.day}>{r.dayLabel}</Text>
                <Text style={styles.summary}>{r.summary}</Text>
              </View>
              <View style={[styles.sessionDot, { backgroundColor: SESSION_DOT[r.session.state] }]} />
              <Text style={[styles.chev, open && styles.chevOpen]}>›</Text>
            </Pressable>

            {open ? (
              <View style={styles.expand}>
                <Detail label="Protein" value={`${r.proteinG} of ${r.proteinTarget}g`} />
                <Detail
                  label="Session"
                  value={
                    r.session.state === "done"
                      ? `${r.session.title ?? "Done"} · ${r.session.minutes} min`
                      : r.session.state === "started"
                        ? `Started · ${r.session.minutes} min, unfinished`
                        : "None"
                  }
                />
                {r.burnedCal != null ? <Detail label="Est. session burn" value={`~${r.burnedCal} cal`} /> : null}
                {r.intakeCal > 0 ? <Detail label="Food logged" value={`${r.intakeCal} of ${r.calorieTarget} cal`} /> : null}
                <View style={styles.readWrap}>
                  <Text style={styles.read}>{r.muscleRead}</Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, paddingTop: 14, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted, marginBottom: 4 },
  rowWrap: { borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowPressed: { opacity: 0.6 },
  mark: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  markHit: { backgroundColor: colors.emerald },
  rowBody: { flex: 1 },
  day: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink, letterSpacing: -0.1 },
  summary: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  chev: { fontFamily: font.semibold, fontSize: 17, color: colors.faint },
  chevOpen: { transform: [{ rotate: "90deg" }] },
  expand: { paddingBottom: 13, gap: 7 },
  detail: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  detailLabel: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  detailValue: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink },
  readWrap: { marginTop: 5, backgroundColor: "rgba(47,184,122,0.07)", borderWidth: 1, borderColor: "rgba(47,184,122,0.22)", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  read: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft },
});

export default DayReviewCard;
