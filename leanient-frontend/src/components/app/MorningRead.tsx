import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface MorningReadProps {
  /** "Morning, Nick." — built by greetingForHour. */
  greeting: string;
  /** The single stat pill; null hides it. */
  pill: { label: string; check: boolean } | null;
}

/**
 * The v2 Home opener: a greeting and one earned stat, no paragraph. Reflection
 * before obligation (design/home-coach.html, morning read).
 */
export function MorningRead({ greeting, pill }: MorningReadProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.greeting} numberOfLines={1}>
        {greeting}
      </Text>
      {pill ? (
        <View style={styles.pill}>
          {pill.check ? (
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12.5l5 5 9-11" />
            </Svg>
          ) : null}
          <Text style={styles.pillText}>{pill.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // mock .morning: padding 2px 22px 4px, greeting 24px extrabold -0.026em
  row: {
    paddingHorizontal: 22,
    paddingTop: 2,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  greeting: {
    flexShrink: 1,
    fontFamily: font.extrabold,
    fontSize: 24,
    letterSpacing: -0.62,
    color: colors.ink,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(47,184,122,0.12)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: {
    fontFamily: font.extrabold,
    fontSize: 12,
    letterSpacing: -0.12,
    color: colors.emeraldDeep,
  },
});

export default MorningRead;
