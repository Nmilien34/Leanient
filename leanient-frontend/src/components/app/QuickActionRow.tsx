import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

type IconProps = { children: React.ReactNode };
const Glyph = ({ children }: IconProps) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

interface QuickActionRowProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onLogWeight: () => void;
  onLogSideEffect: () => void;
}

/**
 * One-tap logging shortcuts on Home, right below the coach's read. Same glyphs
 * and destinations as the quick-log "+" sheet, surfaced so the most common logs
 * are a single tap from the main screen.
 */
export function QuickActionRow({ onLogFood, onLogWorkout, onLogWeight, onLogSideEffect }: QuickActionRowProps) {
  const actions = [
    {
      key: "food",
      label: "Log food",
      onPress: onLogFood,
      icon: <Glyph><Path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11M17 3c-2 1-3 3-3 6s1 4 3 4v8" /></Glyph>,
    },
    {
      key: "workout",
      label: "Workout",
      onPress: onLogWorkout,
      icon: <Glyph><Path d="M5 8v8M19 8v8M8 6v12M16 6v12M8 12h8" /></Glyph>,
    },
    {
      key: "weight",
      label: "Weight",
      onPress: onLogWeight,
      icon: <Glyph><Path d="M4 9h16l-1.5 11h-13zM9 9a3 3 0 0 1 6 0" /></Glyph>,
    },
    {
      key: "side",
      label: "Side effect",
      onPress: onLogSideEffect,
      icon: <Glyph><Polyline points="12,3 21,19 3,19 12,3" /><Path d="M12 9v5M12 17v.5" /></Glyph>,
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={a.onPress}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>{a.icon}</View>
          <Text style={styles.label} numberOfLines={1}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginTop: 12 },
  btn: {
    flex: 1,
    alignItems: "center",
    gap: 7,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(47,184,122,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: -0.1, color: colors.ink },
});

export default QuickActionRow;
