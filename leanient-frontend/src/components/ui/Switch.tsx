import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

/** iOS-style on/off switch (matches the prototype `.tgl`). Green when on. */
export function Switch({ value, onValueChange, accessibilityLabel }: SwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, easing: EASE, useNativeDriver: false }).start();
  }, [anim, value]);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ["#D2D6CC", "#1F9E63"] });
  const knobX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: knobX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 28, borderRadius: 14, justifyContent: "center" },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.28,
    elevation: 2,
  },
});

export default Switch;
