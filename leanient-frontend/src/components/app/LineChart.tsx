import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { colors } from "../../theme/tokens";

const VB_W = 300;
const PAD = 10;

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
}: LineChartProps) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = points.length;
  const plotH = height - PAD * 2;

  const xy = points.map((p, i) => {
    const x = n > 1 ? (i * VB_W) / (n - 1) : VB_W / 2;
    const y = PAD + (1 - (p.value - min) / span) * plotH; // higher value → higher on chart
    return { x, y, color: p.color };
  });

  const polyline = xy.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none">
        {showBaseline ? (
          <Line x1={0} y1={height - PAD} x2={VB_W} y2={height - PAD} stroke="#E9EAE4" strokeWidth={1} />
        ) : null}
        <Polyline points={polyline} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {showDots
          ? xy.map((pt, i) => (
              <Circle key={i} cx={pt.x} cy={pt.y} r={i === n - 1 ? 5 : 4} fill={pt.color ?? stroke} />
            ))
          : null}
      </Svg>
    </View>
  );
}

export default LineChart;
