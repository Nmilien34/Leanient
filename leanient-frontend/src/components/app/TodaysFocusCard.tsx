import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import type { TodaysFocusActionType, TodaysFocusResponse } from "@leanient/shared";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function ActionIcon({ type }: { type: TodaysFocusActionType }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "log_workout":
      return <Svg {...common}><Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" /></Svg>;
    case "log_dose":
      return <Svg {...common}><Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" /></Svg>;
    case "take_photo":
      return <Svg {...common}><Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><Circle cx={12} cy={13} r={3.2} /></Svg>;
    case "view_progress":
      return <Svg {...common}><Path d="M4 19V5M4 19h16M7 14l4-4 3 2 5-6" /></Svg>;
    case "log_meal":
    default:
      return <Svg {...common}><Path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 1-3 3-3 6s1 4 3 4v8" /></Svg>;
  }
}

interface TodaysFocusCardProps {
  focus: TodaysFocusResponse;
  onAction?: () => void;
  /** Section label — "TODAY'S FOCUS" on the week scope, "DO THIS NEXT" on today. */
  eyebrow?: string;
}

/**
 * "Today's Focus" card bound to the shared `TodaysFocusResponse`. Renders nothing
 * when there's no actionable focus (headline null or actionType "none") — Rule 7.
 * Shot-day recovery gets an amber chip; everything else the emerald chip.
 */
export function TodaysFocusCard({ focus, onAction, eyebrow = "TODAY'S FOCUS" }: TodaysFocusCardProps) {
  if (!focus.headline || focus.actionType === "none") return null;

  const amber = focus.category === "shot_day_recovery";
  const chip = amber ? (["#F0C079", "#D08E45"] as const) : (["#6FE0A6", "#23A869"] as const);

  return (
    <View style={styles.focus}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.frow}>
        <LinearGradient colors={chip} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fic}>
          <ActionIcon type={focus.actionType} />
        </LinearGradient>
        <View style={styles.flex}>
          <Text style={styles.ftitle}>{focus.headline}</Text>
          {focus.suggestion ? <Text style={styles.fsub}>{focus.suggestion}</Text> : null}
        </View>
      </View>
      {focus.actionLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={focus.actionLabel} onPress={onAction} style={styles.btn2}>
          <Text style={styles.btn2Text}>{focus.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  focus: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted },
  frow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 11 },
  fic: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  ftitle: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.16, color: colors.ink },
  fsub: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: colors.muted, marginTop: 2 },
  btn2: { marginTop: 15, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.10)", borderWidth: 1.5, borderColor: "rgba(47,184,122,0.35)" },
  btn2Text: { fontFamily: font.semibold, fontSize: 15, color: colors.emeraldDeep },
});

export default TodaysFocusCard;
