import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface WorkoutSessionsCardProps {
  /** From buildWorkoutSessionsCard: eyebrow, title, detail, cta. */
  view: { eyebrow: string; title: string; detail: string; cta: string };
  onPress: () => void;
}

/** "Training proof" card: this week's session count, tapping into workout history. */
export function WorkoutSessionsCard({ view, onPress }: WorkoutSessionsCardProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Workout sessions"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.icon}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" />
          </Svg>
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{view.eyebrow}</Text>
          <Text style={styles.title}>{view.title}</Text>
          <Text style={styles.sub}>{view.detail}</Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{view.cta}</Text>
          <Text style={styles.chev}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, marginTop: 14, marginBottom: 12 },
  flex: { flex: 1 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(47,184,122,0.24)", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16 },
  cardPressed: { opacity: 0.72 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(47,184,122,0.12)" },
  eyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.84, color: colors.emeraldDeep },
  title: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 3 },
  sub: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  cta: { flexDirection: "row", alignItems: "center", gap: 4 },
  ctaText: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep },
  chev: { fontFamily: font.semibold, fontSize: 20, color: colors.emeraldDeep },
});

export default WorkoutSessionsCard;
