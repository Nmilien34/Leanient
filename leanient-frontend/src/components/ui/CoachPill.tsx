import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function ShieldCheck() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5l7 3v5c0 4.5-3 8-7 10.5-4-2.5-7-6-7-10.5v-5l7-3z"
        stroke="#2C332E"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M8.7 12l2.2 2.2 4.4-4.4"
        stroke={colors.emerald}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Soft emerald-tinted coaching banner (`.coach`): shield-check icon + a line of copy. */
export function CoachPill({ children }: { children: string }) {
  return (
    <LinearGradient
      colors={["rgba(47,184,122,0.16)", "rgba(255,255,255,0.7)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.coach}
    >
      <View style={styles.icon}>
        <ShieldCheck />
      </View>
      <Text style={styles.text}>{children}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  coach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  icon: { flexShrink: 0 },
  text: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.14,
    color: colors.inkSoft,
  },
});

export default CoachPill;
