import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { WeekMapView } from "../../screens/app/weekMap";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function CellIcon({ state }: { state: WeekMapView["cells"][number]["state"] }) {
  if (state === "shot") {
    return (
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.amberDeep} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
      </Svg>
    );
  }
  if (state === "hit") {
    return (
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l5 5 9-11" />
      </Svg>
    );
  }
  return null;
}

interface WeekMapCardProps {
  view: WeekMapView;
  /** Opens the week plan sheet. */
  onDetail?: () => void;
}

/**
 * The week laid over the cycle (frame 04): seven cells with shot / easy /
 * mid / guard phases, wins checked, today outlined, and the guard days named
 * in the caption — the week the way the coach plans it.
 */
export function WeekMapCard({ view, onDetail }: WeekMapCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole={onDetail ? "button" : undefined}
        accessibilityLabel="Week plan details"
        onPress={onDetail}
        style={styles.head}
      >
        <Text style={styles.eyebrow}>YOUR WEEK, ON YOUR CYCLE</Text>
        {onDetail ? <Text style={styles.detail}>Details ›</Text> : null}
      </Pressable>

      <View style={styles.row}>
        {view.cells.map((cell, i) => (
          <View key={`${cell.name}-${i}`} style={[styles.day, cell.isToday && styles.dayToday]}>
            <Text style={[styles.dayName, cell.isToday && styles.dayNameToday]}>{cell.name.toUpperCase()}</Text>
            <View
              style={[
                styles.cell,
                cell.state === "hit" && styles.cellHit,
                cell.state === "shot" && styles.cellShot,
              ]}
            >
              <CellIcon state={cell.state} />
            </View>
            <Text
              style={[
                styles.phase,
                cell.phase === "EASY" && styles.phaseEz,
                (cell.phase === "GUARD" || cell.phase === "SHOT") && styles.phaseGd,
              ]}
            >
              {cell.phase}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.caption}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 15c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-10 5-10 2.5 5 3 5" />
        </Svg>
        <Text style={styles.captionText}>{view.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // mock .weekmap: margin 12 20 0, r20, padding 16, shadow 0 8 18 .06
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  detail: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 13 },
  day: { width: 40, alignItems: "center", gap: 6, paddingVertical: 8, borderRadius: 12 },
  dayToday: {
    backgroundColor: "rgba(47,184,122,0.09)",
    borderWidth: 1.5,
    borderColor: colors.emerald,
    paddingVertical: 6.5,
  },
  dayName: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.faint },
  dayNameToday: { color: colors.emeraldDeep },
  cell: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.sageFill,
    alignItems: "center",
    justifyContent: "center",
  },
  cellHit: { backgroundColor: colors.emerald },
  cellShot: { backgroundColor: "#F7ECDB" },
  phase: { fontFamily: font.bold, fontSize: 8.5, letterSpacing: 0.51, color: colors.faint },
  phaseEz: { color: colors.emeraldDeep },
  phaseGd: { color: colors.amberDeep },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  captionText: { flex: 1, fontFamily: font.bold, fontSize: 13, letterSpacing: -0.13, color: colors.inkSoft },
});

export default WeekMapCard;
