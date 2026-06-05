import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/tokens";

interface LoadingSkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single shimmer placeholder block. Compose several for a section skeleton. */
export function LoadingSkeleton({ width = "100%", height = 16, radius = 8, style }: LoadingSkeletonProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.sageFill, opacity: pulse }, style]} />;
}

interface SkeletonCardProps {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

/** A card-shaped skeleton: a stack of shimmer lines inside the standard card frame. */
export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton key={i} width={i === lines - 1 ? "55%" : "100%"} height={14} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 18,
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
});

export default LoadingSkeleton;
