import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface SegButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Full-width variant (e.g. "Prefer not to say"). */
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Glass→emerald selectable segment (sex selector). Mirrors .seg / .seg.sel. */
export function SegButton({ label, selected, onPress, wide = false, style }: SegButtonProps) {
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(sel, { toValue: selected ? 1 : 0, duration: 180, easing: EASE, useNativeDriver: false }).start();
  }, [sel, selected]);

  const labelColor = sel.interpolate({ inputRange: [0, 1], outputRange: [colors.ink, "#FFFFFF"] });
  const edgeOpacity = sel.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={[wide ? styles.wide : styles.flex, { transform: [{ scale: pressScale }] }, style]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => Animated.timing(pressScale, { toValue: 0.98, duration: 110, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(pressScale, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
        style={[styles.seg, wide && styles.segWide]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sel }]}>
          <LinearGradient
            colors={["#4ECF8B", "#2DB87A", "#1F9E63"]}
            locations={[0, 0.6, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.edge, { opacity: edgeOpacity }]} />
        <Animated.Text style={[styles.label, { color: labelColor }]}>{label}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wide: { width: "100%" },
  seg: {
    height: 58,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  segWide: { height: 54 },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 16,
    letterSpacing: -0.16,
  },
});

export default SegButton;
