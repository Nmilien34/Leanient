import React, { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { staggeredRevealDelay } from "./staggeredRevealTiming";

const DEFAULT_DURATION_MS = 380;
const DEFAULT_DISTANCE = 12;
const REVEAL_EASE = Easing.out(Easing.cubic);

export { staggeredRevealDelay } from "./staggeredRevealTiming";

interface StaggeredRevealProps {
  children: ReactNode;
  index: number;
  enabled?: boolean;
  durationMs?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export function StaggeredReveal({
  children,
  index,
  enabled = true,
  durationMs = DEFAULT_DURATION_MS,
  distance = DEFAULT_DISTANCE,
  style,
}: StaggeredRevealProps) {
  const reveal = useRef(new Animated.Value(enabled ? 0 : 1)).current;

  useEffect(() => {
    if (!enabled) {
      reveal.setValue(1);
      return;
    }

    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: durationMs,
      delay: staggeredRevealDelay(index),
      easing: REVEAL_EASE,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [durationMs, enabled, index, reveal]);

  const animatedStyle = {
    opacity: reveal,
    transform: [
      {
        translateY: reveal.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default StaggeredReveal;
