import React, { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;

interface MetricRingProps {
  ratio: number; // 0..1
  value: string;
  label: string;
  color?: string;
}

/** A metric tile with an animated SVG progress ring (protein / training). */
export function MetricRing({ ratio, value, label, color = colors.emerald }: MetricRingProps) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(fill, {
      toValue: Math.max(0, Math.min(1, ratio)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [fill, ratio]);

  const dashoffset = fill.interpolate({ inputRange: [0, 1], outputRange: [RING_C, 0] });

  return (
    <View style={styles.tile}>
      <Svg width={46} height={46} viewBox="0 0 46 46">
        <Circle cx={23} cy={23} r={RING_R} stroke="#E9EAE4" strokeWidth={5} fill="none" />
        <AnimatedCircle
          cx={23}
          cy={23}
          r={RING_R}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_C}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 23 23)"
        />
      </Svg>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

interface TrendTileProps {
  series: number[];
  deltaLabel: string;
  label: string;
  color?: string;
}

/** A metric tile with a weight sparkline. */
export function TrendTile({ series, deltaLabel, label, color = colors.emerald }: TrendTileProps) {
  const points = useMemo(() => {
    if (series.length < 2) return "2,17 118,17";
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const stepX = 116 / (series.length - 1);
    return series
      .map((v, i) => {
        const x = 2 + i * stepX;
        const y = 28 - ((v - min) / span) * 22; // higher weight → higher line
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [series]);

  return (
    <View style={styles.tile}>
      <Svg width="100%" height={34} viewBox="0 0 120 34" preserveAspectRatio="none">
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.value}>{deltaLabel}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

interface InfoTileProps {
  icon: ReactNode;
  value: string;
  label: string;
  /** When set the tile becomes a button; a chevron on the label hints at it. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** A metric tile with a custom icon instead of a ring (e.g. next-shot countdown). */
export function InfoTile({ icon, value, label, onPress, accessibilityLabel }: InfoTileProps) {
  const inner = (
    <>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.infoLabelRow}>
        <Text style={styles.label}>{label}</Text>
        {onPress ? <Text style={styles.infoChevron}>›</Text> : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.tile}>{inner}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  tilePressed: { opacity: 0.6 },
  value: { fontFamily: font.bold, fontSize: 13, color: colors.ink, textAlign: "center" },
  label: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  infoChevron: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep, marginTop: -1 },
  infoIcon: { height: 46, alignItems: "center", justifyContent: "center" },
});

export default MetricRing;
