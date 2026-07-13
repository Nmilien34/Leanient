import React, { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

/**
 * The breath between conversation turns: each onboarding screen eases in
 * (fade + a small rise) when the step changes. Keyed by step in App.tsx, so a
 * remount runs the entrance once per screen.
 */
export function StepTransition({ children }: { children: ReactNode }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default StepTransition;
