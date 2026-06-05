import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { Workout, WorkoutCategory } from "@leanient/shared";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const THUMB: Record<WorkoutCategory, readonly [string, string]> = {
  strength: ["#6FE0A6", "#23A869"],
  conditioning: ["#9AC8E0", "#5E93B6"],
  mobility: ["#F0C079", "#D08E45"],
  recovery: ["#C9D6BE", "#8AA07E"],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A workout library row: gradient thumb + title + meta + chevron. */
export function WorkoutCard({ workout, onPress }: { workout: Workout; onPress?: () => void }) {
  const meta = `${workout.durationMinutes} min · ${workout.equipment} · ${workout.intensity}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={workout.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient colors={THUMB[workout.category]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.thumb}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
        </Svg>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.meta}>{cap(meta)}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  pressed: { backgroundColor: colors.sageFill },
  thumb: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 15, letterSpacing: -0.15, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  chev: { fontFamily: font.regular, fontSize: 22, color: colors.faintest },
});

export default WorkoutCard;
