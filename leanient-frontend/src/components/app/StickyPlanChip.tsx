import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface StickyPlanChipProps {
  visible: boolean;
  done: number;
  total: number;
  /** Scrolls Home back to the plan. */
  onPress: () => void;
}

/**
 * Frame 07: once the plan scrolls away, this glass strip keeps the day's
 * state pinned under the status bar — progress bar, N OF M, tap to snap back.
 */
export function StickyPlanChip({ visible, done, total, onPress }: StickyPlanChipProps) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, rise]);

  const pct = total > 0 ? Math.max(0.04, done / total) : 0;

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.wrap,
        {
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Today's plan, ${done} of ${total} done. Back to the plan`}
        onPress={onPress}
        style={styles.chipRow}
      >
        <Text style={styles.label}>TODAY'S PLAN</Text>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.count}>
          {done} OF {total}
        </Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 20, right: 20, top: 6, zIndex: 10 },
  // mock .stickyplan: glass strip, r14, padding 10/14
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(252,252,250,0.92)",
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  label: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.74, color: colors.muted },
  bar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#E4E5DF", overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.emerald },
  count: { fontFamily: font.extrabold, fontSize: 12, color: colors.emeraldDeep },
  chev: { fontFamily: font.semibold, fontSize: 15, color: colors.faint, transform: [{ rotate: "-90deg" }] },
});

export default StickyPlanChip;
