import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { ProjectedPath } from "../../screens/app/projectedPath";
import { LineChart } from "./LineChart";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface ProjectedPathCardProps {
  path: ProjectedPath;
  style?: StyleProp<ViewStyle>;
}

/**
 * Cold-start stand-in for the empty muscle-retention chart. Draws the projected
 * weight path from today to goal at the user's pace, with an honest note on the
 * muscle at stake — so a new user's Progress screen shows the road ahead instead
 * of a blank "gathering data" card. Real data replaces it after the first check-in.
 */
export function ProjectedPathCard({ path, style }: ProjectedPathCardProps) {
  const points = path.points.map((value) => ({ value }));

  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <Text style={styles.title}>Your path ahead</Text>
        <Text style={styles.tag}>PROJECTED</Text>
      </View>

      <View style={styles.chartWrap}>
        <LineChart points={points} height={72} stroke={colors.emeraldDeep} />
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisDark}>{path.startLabel}</Text>
        <Text style={styles.axisMuted}>by {path.etaLabel}</Text>
        <Text style={styles.axisDark}>{path.goalLabel}</Text>
      </View>

      <Text style={styles.note}>
        Of the ~{path.toLose} {path.unit} ahead, <Text style={styles.noteStrong}>~{path.muscleAtRisk} {path.unit} could be muscle</Text> without a plan. That's the part we protect.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: font.bold, fontSize: 15.5, letterSpacing: -0.2, color: colors.ink },
  tag: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.7, color: colors.muted, backgroundColor: colors.sageFill, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, overflow: "hidden" },
  chartWrap: { marginTop: 14 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  axisDark: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  axisMuted: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted },
  note: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  noteStrong: { fontFamily: font.bold, color: colors.ink },
});

export default ProjectedPathCard;
