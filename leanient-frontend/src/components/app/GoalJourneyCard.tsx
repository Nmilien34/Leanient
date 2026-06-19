import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { GoalJourneyView } from "../../screens/app/goalJourney";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface GoalJourneyCardProps {
  view: GoalJourneyView;
}

const round = (n: number) => `${Math.round(n * 10) / 10}`.replace(/\.0$/, "");

/** The walking figure that rides the track toward the finish flag. */
function Walker() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={4.5} r={2} fill="#fff" stroke="none" />
      <Path d="M12 8v6M12 10l-3.5 2M12 10l3.5 1.5M10 21l2-5 2.2 4.2" />
    </Svg>
  );
}

/** The finish line at the goal end of the track. */
function Flag() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 21V5a2 2 0 0 1 2-2h11l-2.5 4L18 11H7" />
    </Svg>
  );
}

/**
 * Progress "journey to goal" card: the difference since you started, then a track
 * with a walking marker at your real position moving toward the finish, paced by
 * the speed you picked at onboarding (see buildGoalJourney). Gives the Progress
 * screen a clear, motivating sense of progress.
 */
export function GoalJourneyCard({ view }: GoalJourneyCardProps) {
  const pct = view.pct;
  const up = view.changeLb < -0.05; // gained weight

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
        {!view.reached ? (
          <View style={styles.paceChip}>
            <Text style={styles.paceChipText}>{view.paceLabel} pace</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.focal}>
        <Text style={styles.current}>{round(view.currentWeight)}</Text>
        <Text style={styles.unit}>{view.unit}</Text>
        {Math.abs(view.changeLb) >= 0.1 ? (
          <View style={[styles.diff, up ? styles.diffUp : null]}>
            <Text style={[styles.diffText, up ? styles.diffTextUp : null]}>
              {up ? "↑" : "↓"} {Math.abs(view.changeLb).toFixed(1)} {view.unit} since start
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.track}>
        <View style={styles.trackBase} />
        <View style={[styles.trackFill, { width: `${Math.max(2, pct)}%` }]} />
        <View style={[styles.marker, { left: `${pct}%` }]}>
          <Walker />
        </View>
        <View style={styles.flag}>
          <Flag />
        </View>
      </View>

      <View style={styles.labels}>
        <Text style={styles.label}>
          {round(view.startWeight)} {view.unit} start
        </Text>
        <Text style={styles.labelGoal}>
          {round(view.goalWeight)} {view.unit} goal
        </Text>
      </View>

      <Text style={styles.headline}>{view.headline}</Text>
      <Text style={styles.caption}>{view.caption}</Text>
    </View>
  );
}

const MARKER = 28;

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  paceChip: { backgroundColor: colors.sageFill, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  paceChipText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.1, color: colors.emeraldDeep, textTransform: "capitalize" },
  focal: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 10 },
  current: { fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.6, color: colors.ink },
  unit: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  diff: { alignSelf: "center", marginLeft: 4, backgroundColor: "rgba(47,184,122,0.12)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  diffUp: { backgroundColor: "rgba(227,166,94,0.16)" },
  diffText: { fontFamily: font.bold, fontSize: 12, color: colors.emeraldDeep },
  diffTextUp: { color: colors.amberDeep },
  track: { height: MARKER, marginTop: 22, marginBottom: 4, justifyContent: "center", position: "relative" },
  trackBase: { position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: colors.sageFill },
  trackFill: { position: "absolute", left: 0, height: 6, borderRadius: 3, backgroundColor: colors.emerald },
  marker: { position: "absolute", marginLeft: -MARKER / 2, width: MARKER, height: MARKER, borderRadius: MARKER / 2, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  flag: { position: "absolute", right: -2, top: -1, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(47,184,122,0.14)", alignItems: "center", justifyContent: "center" },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  label: { fontFamily: font.semibold, fontSize: 11.5, color: colors.faint },
  labelGoal: { fontFamily: font.semibold, fontSize: 11.5, color: colors.emeraldDeep },
  headline: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink, marginTop: 14, letterSpacing: -0.15 },
  caption: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 2 },
});

export default GoalJourneyCard;
