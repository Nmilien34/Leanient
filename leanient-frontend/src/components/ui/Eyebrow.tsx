import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

/** Small-caps section label (e.g. "SEX ASSIGNED AT BIRTH"). */
export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 1.08, // 0.09em * 12
    color: colors.muted,
  },
});

export default Eyebrow;
