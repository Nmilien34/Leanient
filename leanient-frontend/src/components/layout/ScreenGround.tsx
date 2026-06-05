import React from "react";
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import { RadialGlow } from "./RadialGlow";

/**
 * Shared onboarding screen ground — ported from .screen:
 * base #F4F3EF with a faint sky wash (top-right) and honey wash (bottom-left).
 * Reused across all onboarding screens; layer screen-specific glows on top.
 */
export function ScreenGround({ style }: { style?: ViewStyle }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#F4F3EF" }, style]}>
      <RadialGlow
        size={Math.max(width, height) * 0.95}
        position={{ top: -height * 0.12, right: -width * 0.4 }}
        stops={[
          { offset: 0, color: "#86BBD8", opacity: 0.12 },
          { offset: 0.58, color: "#86BBD8", opacity: 0 },
        ]}
      />
      <RadialGlow
        size={Math.max(width, height) * 0.95}
        position={{ bottom: -height * 0.1, left: -width * 0.4 }}
        stops={[
          { offset: 0, color: "#F0B088", opacity: 0.11 },
          { offset: 0.6, color: "#F0B088", opacity: 0 },
        ]}
      />
    </View>
  );
}

export default ScreenGround;
