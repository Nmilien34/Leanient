import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import type { ChartXY, GoalPathView, WeightTrendView } from "../../screens/app/progressRedesign";
import { areaPath, smoothPath } from "../../screens/app/chartPath";
import { colors } from "../../theme/tokens";

/**
 * The redesigned Progress charts (design/progress.html): smooth monotone
 * curves with a gradient fill under the line, drawn with react-native-svg so
 * no new native dependency is needed. Geometry comes pre-normalized (0..1)
 * from progressRedesign.ts.
 */

const VB_W = 322;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;

interface Scaled {
  x: (p: ChartXY) => number;
  y: (p: ChartXY) => number;
}

function makeScale(height: number): Scaled {
  const plotW = VB_W - PAD_X * 2;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  return {
    x: (p) => PAD_X + p.x * plotW,
    y: (p) => PAD_TOP + p.y * plotH,
  };
}

const toPixels = (points: ChartXY[], s: Scaled) => points.map((p) => ({ x: s.x(p), y: s.y(p) }));

const linePath = (points: ChartXY[], s: Scaled) => smoothPath(toPixels(points, s));
const fillPath = (points: ChartXY[], s: Scaled, height: number) => areaPath(toPixels(points, s), height - 2);

/* ============================ weight trend ============================ */

interface TrendChartProps {
  view: Pick<WeightTrendView, "trend" | "noise" | "projection" | "startLabel" | "nowLabel">;
  height?: number;
  /** Faded label under the projection tail in early mode. */
  projectionLabel?: string;
}

/** Smoothed trend line + gradient fill + faint raw-noise dots. */
export function TrendChart({ view, height = 118, projectionLabel }: TrendChartProps) {
  const s = makeScale(height);
  const { trend, noise, projection } = view;
  if (trend.length === 0) return null;

  const first = trend[0];
  const last = trend[trend.length - 1];
  const lastX = s.x(last);
  const nowAnchor: "start" | "end" = last.x > 0.72 ? "end" : "start";

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.emerald} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {trend.length >= 2 ? <Path d={fillPath(trend, s, height)} fill="url(#trendFill)" /> : null}
        <Path d={linePath(trend, s)} fill="none" stroke={colors.emerald} strokeWidth={3} strokeLinecap="round" />
        {projection ? (
          <Path
            d={`M ${s.x(projection[0]).toFixed(1)} ${s.y(projection[0]).toFixed(1)} L ${s.x(projection[1]).toFixed(1)} ${s
              .y(projection[1])
              .toFixed(1)}`}
            fill="none"
            stroke={colors.faintest}
            strokeWidth={2}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
        ) : null}
        <G fill={colors.emerald} opacity={0.3}>
          {noise.map((p, i) => (
            <Circle key={i} cx={s.x(p)} cy={s.y(p)} r={2.5} />
          ))}
        </G>
        <Circle cx={s.x(first)} cy={s.y(first)} r={4.5} fill={colors.faint} stroke="#fff" strokeWidth={2} />
        <Circle cx={lastX} cy={s.y(last)} r={5.5} fill={colors.emerald} stroke="#fff" strokeWidth={2.5} />
        <SvgText
          x={s.x(first) + 8}
          y={Math.max(11, s.y(first) - 8)}
          fontSize={11}
          fontWeight="700"
          fill={colors.muted}
        >
          {view.startLabel}
        </SvgText>
        <SvgText
          x={nowAnchor === "end" ? lastX - 10 : lastX + 10}
          y={Math.max(12, s.y(last) - 10)}
          fontSize={12}
          fontWeight="800"
          fill={colors.emeraldDeep}
          textAnchor={nowAnchor}
        >
          {view.nowLabel}
        </SvgText>
        {projection && projectionLabel ? (
          <SvgText
            x={VB_W - PAD_X}
            y={s.y(projection[1]) - 8}
            fontSize={10.5}
            fontWeight="600"
            fill={colors.faint}
            textAnchor="end"
          >
            {projectionLabel}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

/* ============================= goal path ============================= */

/** Your solid line vs the dashed plan line, today marker, flag at plan date. */
export function GoalPathChart({ view, height = 128 }: { view: GoalPathView; height?: number }) {
  const s = makeScale(height);
  const { actual, yourPath, plan, today, planEnd } = view;

  const todayX = s.x(today);
  const todayY = s.y(today);
  const flagX = Math.min(s.x(planEnd), VB_W - PAD_X - 4);
  const flagY = Math.min(s.y(planEnd), height - PAD_BOTTOM - 12);
  const yourLabelAnchor: "start" | "end" = today.x > 0.55 ? "end" : "start";

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`}>
        <Defs>
          <LinearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.emerald} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* plan line, start → goal at the chosen pace */}
        <Line
          x1={s.x(plan[0])}
          y1={s.y(plan[0])}
          x2={s.x(plan[1])}
          y2={s.y(plan[1])}
          stroke={colors.faintest}
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        {/* your logged line + fill */}
        {actual.length >= 2 ? <Path d={fillPath(actual, s, height)} fill="url(#goalFill)" /> : null}
        <Path d={linePath(actual, s)} fill="none" stroke={colors.emerald} strokeWidth={3.2} strokeLinecap="round" />
        {/* your pace, dotted, today → goal */}
        {yourPath ? (
          <Path
            d={`M ${s.x(yourPath[0]).toFixed(1)} ${s.y(yourPath[0]).toFixed(1)} L ${s.x(yourPath[1]).toFixed(1)} ${s
              .y(yourPath[1])
              .toFixed(1)}`}
            fill="none"
            stroke={colors.emerald}
            strokeWidth={2.2}
            strokeDasharray="2 6"
            strokeLinecap="round"
            opacity={0.8}
          />
        ) : null}
        {/* today */}
        <Line
          x1={todayX}
          y1={Math.max(PAD_TOP - 6, todayY - 6)}
          x2={todayX}
          y2={height - PAD_BOTTOM}
          stroke={colors.line}
          strokeWidth={1.5}
        />
        <Circle cx={todayX} cy={todayY} r={5.5} fill={colors.emerald} stroke="#fff" strokeWidth={2.5} />
        <SvgText
          x={todayX}
          y={height - 1}
          fontSize={10}
          fontWeight="700"
          fill={colors.emeraldDeep}
          textAnchor="middle"
        >
          TODAY
        </SvgText>
        {/* the flag at the plan's arrival */}
        <Circle cx={flagX} cy={flagY} r={11} fill="#F7ECDB" stroke={colors.amber} strokeWidth={1.5} />
        <Path
          d={`M ${flagX - 3} ${flagY + 5} v -10 h 6 l -1.6 2.5 1.6 2.5 h -5`}
          fill="none"
          stroke={colors.amberDeep}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {view.yourEtaLabel ? (
          <SvgText
            x={yourLabelAnchor === "end" ? todayX - 10 : todayX + 10}
            y={Math.max(12, todayY - 10)}
            fontSize={11.5}
            fontWeight="800"
            fill={colors.emeraldDeep}
            textAnchor={yourLabelAnchor}
          >
            {view.yourEtaLabel}
          </SvgText>
        ) : null}
        <SvgText x={flagX - 16} y={Math.min(height - 4, flagY + 19)} fontSize={10.5} fontWeight="700" fill={colors.muted} textAnchor="end">
          {view.planEtaLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
});

/* =========================== muscle trend =========================== */

/** Smooth rising retention curve with gradient fill. */
export function MuscleTrendChart({ points, height = 74 }: { points: ChartXY[]; height?: number }) {
  const s = makeScale(height);
  if (points.length === 0) return null;
  const last = points[points.length - 1];

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`}>
        <Defs>
          <LinearGradient id="muscleFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.emerald} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {points.length >= 2 ? <Path d={fillPath(points, s, height)} fill="url(#muscleFill)" /> : null}
        <Path d={linePath(points, s)} fill="none" stroke={colors.emerald} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={s.x(last)} cy={s.y(last)} r={5} fill={colors.emerald} stroke="#fff" strokeWidth={2.5} />
      </Svg>
    </View>
  );
}
