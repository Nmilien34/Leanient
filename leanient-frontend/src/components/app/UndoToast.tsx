import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface UndoToastProps {
  /** Null hides the toast. */
  message: string | null;
  onUndo: () => void;
}

/**
 * Frame 06: the ink glass confirmation for zero-decision ticks. Floats above
 * the tab bar, slides in with the check, offers Undo, and the parent's timer
 * dismisses it. No sheet, no navigation.
 */
export function UndoToast({ message, onUndo }: UndoToastProps) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: message ? 1 : 0,
      duration: message ? 260 : 180,
      easing: message ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [message, rise]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <View style={styles.toast}>
        <View style={styles.dot}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l5 5 9-11" />
          </Svg>
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Undo" hitSlop={8} onPress={onUndo} style={styles.undo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 20, right: 20, bottom: 96, alignItems: "center" },
  // ink glass: dark pill floating over the paper app
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(23,25,27,0.94)",
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 12,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    shadowOpacity: 0.35,
    elevation: 8,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flexShrink: 1, fontFamily: font.semibold, fontSize: 13.5, letterSpacing: -0.14, color: "#F4F8EF" },
  undo: {
    backgroundColor: "rgba(111,224,166,0.16)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  undoText: { fontFamily: font.bold, fontSize: 12.5, color: colors.emeraldHi },
});

export default UndoToast;
