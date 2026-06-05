import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

let __rg = 0;

export interface GlowStop {
  offset: number;
  color: string;
  opacity: number;
}

interface RadialGlowProps {
  size: number;
  stops: GlowStop[];
  /** Absolute position within the parent (top/left/right/bottom in px). */
  position: Pick<ViewStyle, "top" | "left" | "right" | "bottom">;
  /** Soft pulse (opacity .7→1, scale 1→1.06). */
  pulse?: boolean;
  pulseDuration?: number;
}

/** A soft radial color wash — the building block for the splash aura and screen glows. */
export function RadialGlow({ size, stops, position, pulse = false, pulseDuration = 5000 }: RadialGlowProps) {
  const id = useRef(`glow${__rg++}`).current;
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const half = pulseDuration / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseDuration, v]);

  const animatedStyle = pulse
    ? {
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
      }
    : undefined;

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, position, animatedStyle]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {stops.map((s, i) => (
              <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export default RadialGlow;
