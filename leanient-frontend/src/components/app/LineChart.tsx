import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, G, Line, Polyline } from "react-native-svg";
import { colors } from "../../theme/tokens";

const VB_W = 300;
const PAD = 10;

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface ChartPoint {
  value: number;
  /** Optional per-point dot color (e.g. that week's verdict status color). */
  color?: string;
}

interface LineChartProps {
  points: ChartPoint[];
  height?: number;
  stroke?: string;
  showDots?: boolean;
  showBaseline?: boolean;
  /** Draw the line in left-to-right on mount/data change. */
  animate?: boolean;
}

/**
 * A minimal data-driven line chart (react-native-svg). The polyline + dots are
 * computed from the `points` values, so the line is fully dynamic — pass weight
 * logs, a retention series, etc.
 */
export function LineChart({
  points,
  height = 80,
  stroke = colors.emerald,
  showDots = false,
  showBaseline = false,
  animate = true,
}: LineChartProps) {
  const n = points.length;
  const plotH = height - PAD * 2;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  // Flat series (all equal, includes the single-point case): sit the line at the
  // vertical center so it reads as steady instead of pinned to the bottom edge.
  const flat = span === 0;

  const xy = points.map((p, i) => {
    const x = n > 1 ? (i * VB_W) / (n - 1) : VB_W / 2;
    const y = flat ? PAD + plotH / 2 : PAD + (1 - (p.value - min) / span) * plotH; // higher value → higher
    return { x, y, color: p.color };
  });

  // A Polyline needs two points to render. With a single data point, draw a flat
  // line across the width so one weigh-in / snapshot still shows up.
  const linePoints =
    n === 1
      ? [`0,${xy[0].y.toFixed(1)}`, `${VB_W},${xy[0].y.toFixed(1)}`]
      : xy.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  const polyline = linePoints.join(" ");

  // Always surface a dot for a lone point so it's visible even when dots are off.
  const dots = showDots || n === 1 ? xy : [];

  // Length of the drawn line in viewBox units, used to reveal it left-to-right.
  const lineLength =
    n === 1
      ? VB_W
      : xy.reduce((sum, pt, i) => (i === 0 ? 0 : sum + Math.hypot(pt.x - xy[i - 1].x, pt.y - xy[i - 1].y)), 0);

  const draw = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const dotsOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;

  // Re-run on data change so a new series draws itself in. `polyline` captures it.
  useEffect(() => {
    if (!animate) return;
    draw.setValue(0);
    dotsOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(draw, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 320, delay: 520, useNativeDriver: false }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the polyline string is the data identity
  }, [polyline]);

  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [lineLength, 0] });

  // Nothing to draw (callers normally show an empty state instead). Returned
  // after the hooks above so hook order stays stable.
  if (n === 0) {
    return (
      <View>
        <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none" />
      </View>
    );
  }

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none">
        {showBaseline ? (
          <Line x1={0} y1={height - PAD} x2={VB_W} y2={height - PAD} stroke="#E9EAE4" strokeWidth={1} />
        ) : null}
        <AnimatedPolyline
          points={polyline}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={lineLength}
          strokeDashoffset={dashOffset}
        />
        <AnimatedG opacity={dotsOpacity}>
          {dots.map((pt, i) => (
            <Circle key={i} cx={pt.x} cy={pt.y} r={i === n - 1 ? 5 : 4} fill={pt.color ?? stroke} />
          ))}
        </AnimatedG>
      </Svg>
    </View>
  );
}

export default LineChart;
