import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";

/** 40px sage circle with a back chevron. Shared by ScreenHeader and standalone uses. */
export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.sageSoft }]}
    >
      <Svg width={9} height={16} viewBox="0 0 9 16" fill="none">
        <Path d="M8 1L1.5 8L8 15" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sageFill,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BackButton;
