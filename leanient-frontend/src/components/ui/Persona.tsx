import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function Chevron({ color }: { color: Animated.AnimatedInterpolation<string> | string }) {
  return (
    <Svg width={9} height={14} viewBox="0 0 9 14" fill="none">
      <AnimatedPath
        d="M1.5 1L7 7l-5.5 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface PersonaProps {
  label: string;
  chevrons: number;
  selected: boolean;
  onPress: () => void;
}

/** A tappable pace persona card with chevrons + label and an animated selected state. */
export function Persona({ label, chevrons, selected, onPress }: PersonaProps) {
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(sel, { toValue: selected ? 1 : 0, duration: 180, easing: EASE, useNativeDriver: false }).start();
  }, [sel, selected]);

  const labelColor = sel.interpolate({ inputRange: [0, 1], outputRange: [colors.muted, "#F4F7F0"] });
  const chevColor = sel.interpolate({ inputRange: [0, 1], outputRange: ["#9AA595", "#DEE7D4"] });
  const edgeOpacity = sel.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.persona}
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

      <Animated.View style={styles.chevRow}>
        {Array.from({ length: chevrons }, (_, i) => (
          <Chevron key={i} color={chevColor} />
        ))}
      </Animated.View>
      <Animated.Text style={[styles.label, { color: labelColor }]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  persona: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.glass,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassLine,
  },
  chevRow: { flexDirection: "row", gap: 3 },
  label: {
    fontFamily: font.semibold,
    fontSize: 14,
    letterSpacing: -0.14,
  },
});

export default Persona;
