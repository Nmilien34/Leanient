import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

export interface ToggleOption<T> {
  label: string;
  value: T;
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A single pill segment with an animated selected highlight (matches `.toggle div`). */
function Segment<T extends string>({
  option,
  selected,
  onPress,
}: {
  option: ToggleOption<T>;
  selected: boolean;
  onPress: () => void;
}) {
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(sel, { toValue: selected ? 1 : 0, duration: 160, easing: EASE, useNativeDriver: false }).start();
  }, [sel, selected]);

  const labelColor = sel.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, colors.ink] });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      onPress={onPress}
      style={styles.segment}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.segmentSel, { opacity: sel }]}
      />
      <Animated.Text style={[styles.label, { color: labelColor }]}>{option.label}</Animated.Text>
    </Pressable>
  );
}

/** Segmented pill toggle (e.g. Imperial / Metric). Centered, fit-content. */
export function Toggle<T extends string>({ options, value, onChange }: ToggleProps<T>) {
  return (
    <View style={styles.wrap}>
      <View style={styles.toggle}>
        {options.map((o) => (
          <Segment key={o.value} option={o} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  toggle: {
    flexDirection: "row",
    gap: 4,
    padding: 5,
    borderRadius: 16,
    backgroundColor: "rgba(228,235,219,0.7)",
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  segmentSel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    backgroundColor: colors.glassWhite,
    shadowColor: "rgba(24,36,27,1)",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
    elevation: 2,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 14,
    letterSpacing: -0.14,
  },
});

export default Toggle;
