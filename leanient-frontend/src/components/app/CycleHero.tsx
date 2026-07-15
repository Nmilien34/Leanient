import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { RadialGlow } from "../layout/RadialGlow";
import type { CyclePersonality } from "../../screens/app/cyclePersonality";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Ribbon geometry, 1:1 with design/home-coach.html (viewBox 324x48): node
// centers along x, med-level curve heights along y (peak on day 2, fading out).
const XS = [21, 68, 115, 162, 209, 256, 303];
const YS = [32, 12, 8, 13, 21, 30, 38];
const CURVE =
  "M21 32 C 40 18, 52 12, 68 12 S 100 8, 115 8 S 146 10, 162 13 S 194 17, 209 21 S 241 26, 256 30 S 288 35, 303 38";
const CURVE_LENGTH = 300;
// Fallback for off-schedule renders; real cells come from buildCycleRibbon.
const FALLBACK_CELLS = ["SHOT", "+1", "+2", "+3", "+4", "+5", "+6"].map((label, i) => ({
  label,
  isShot: i === 0,
}));

function NodeCheck() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.emerald} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-11" />
    </Svg>
  );
}

function SyringeBadge() {
  return (
    <View style={styles.badge}>
      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={colors.amberDeep} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 20l9-9M14 4l6 6-7 1-1-7zM13 7l4 4" />
      </Svg>
    </View>
  );
}

interface CycleHeroProps {
  /** "Thursday · Day 46 · Wegovy 1.0 mg" (built by the caller from the cycle). */
  contextLabel: string;
  personality: CyclePersonality;
  /** 0 = shot day … 6. Marks TODAY on the ribbon. */
  daysSinceShot: number;
  /** Schedule-true ribbon cells (buildCycleRibbon); every shot day is marked. */
  cells?: Array<{ label: string; isShot: boolean }>;
  onPress?: () => void;
}

/**
 * The v2 Home hero: the shot cycle is the spine. Day-personality pill and
 * headline, the 7-node ribbon under the med-level curve (drawn in on mount,
 * today's node breathing), and the YOUR PATTERN line.
 */
export function CycleHero({ contextLabel, personality, daysSinceShot, cells, onPress }: CycleHeroProps) {
  const today = Math.max(0, Math.min(6, daysSinceShot));
  const accent = personality.amber ? colors.amber : colors.emerald;
  const accentDeep = personality.amber ? colors.amberDeep : colors.emeraldDeep;

  // The curve draws itself once; today's node breathes gently forever.
  const draw = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(draw, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [draw, breathe]);

  const dashoffset = draw.interpolate({ inputRange: [0, 1], outputRange: [CURVE_LENGTH, 0] });
  const breatheStyle = {
    transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }],
  };

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${personality.headline} ${personality.headlineSub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      <RadialGlow
        size={160}
        position={{ top: -50, right: -40 }}
        stops={[
          { offset: 0, color: accent, opacity: 0.32 },
          { offset: 0.7, color: accent, opacity: 0 },
        ]}
      />
      <Text style={styles.ctx}>{contextLabel}</Text>

      <View style={[styles.pill, personality.amber && styles.pillAmber]}>
        <View style={[styles.pillDot, { backgroundColor: accent }]} />
        <Text style={[styles.pillText, personality.amber && styles.pillTextAmber]}>{personality.pill}</Text>
      </View>

      <Text style={styles.headline}>
        {personality.headline} <Text style={styles.headlineSub}>{personality.headlineSub}</Text>
      </Text>

      {/* ribbon */}
      <View style={styles.ribbon}>
        <Svg width="100%" height={48} viewBox="0 0 324 48" preserveAspectRatio="none">
          <AnimatedPath
            d={CURVE}
            fill="none"
            stroke="rgba(47,184,122,0.35)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={CURVE_LENGTH}
            strokeDashoffset={dashoffset}
          />
          <Circle cx={XS[today]} cy={YS[today]} r={5.5} fill={accent} stroke="#fff" strokeWidth={2.5} />
        </Svg>
        <View style={styles.nodes}>
          {(cells ?? FALLBACK_CELLS).map(({ label, isShot }, i) => {
            const isToday = i === today;
            const isPast = i < today;
            const node = (
              <View
                style={[
                  styles.nodeCircle,
                  isPast && styles.nodePast,
                  isToday && [styles.nodeToday, { borderColor: accent, shadowColor: accent }],
                ]}
              >
                {isPast ? <NodeCheck /> : null}
                {isToday ? <View style={[styles.nodeDot, { backgroundColor: accent }]} /> : null}
                {isShot ? <SyringeBadge /> : null}
              </View>
            );
            return (
              <View key={`${label}-${i}`} style={styles.node}>
                {isToday ? <Animated.View style={breatheStyle}>{node}</Animated.View> : node}
                <Text style={[styles.nodeLabel, isToday && { color: accentDeep }]}>{isToday ? "TODAY" : label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* YOUR PATTERN */}
      <View style={styles.pattern}>
        <View style={styles.patternIcon}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 15c2.5 0 2.5-6 5-6s2.5 8 5 8 2.5-10 5-10 2.5 5 3 5" />
          </Svg>
        </View>
        <View style={styles.patternBody}>
          <Text style={styles.patternLabel}>YOUR PATTERN</Text>
          <Text style={styles.patternText}>{personality.pattern}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // mock .cyclecard: margin 10 20 0, r22, padding 18 18 16, shadow 0 14 24 .09
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    shadowOpacity: 0.09,
    elevation: 4,
  },
  pressed: { opacity: 0.92 },
  ctx: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 11,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(47,184,122,0.13)",
  },
  pillAmber: { backgroundColor: "rgba(227,166,94,0.16)" },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.8, color: colors.emeraldDeep },
  pillTextAmber: { color: colors.amberDeep },
  headline: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 28, letterSpacing: -0.62, color: colors.ink, marginTop: 10 },
  headlineSub: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.15, color: colors.muted },
  ribbon: { marginTop: 16 },
  nodes: { flexDirection: "row", justifyContent: "space-between", marginTop: -22 },
  node: { width: 40, alignItems: "center", gap: 5 },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.sageFill,
    alignItems: "center",
    justifyContent: "center",
  },
  nodePast: { backgroundColor: "#E7F4EC" },
  nodeToday: {
    backgroundColor: "#fff",
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
    elevation: 3,
  },
  nodeDot: { width: 9, height: 9, borderRadius: 5 },
  nodeLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.5, color: colors.faint },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F7ECDB",
    borderWidth: 1.5,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    shadowOpacity: 0.15,
    elevation: 2,
  },
  pattern: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  patternIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(47,184,122,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  patternBody: { flex: 1 },
  patternLabel: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 0.76, color: colors.emeraldDeep },
  patternText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.inkSoft, marginTop: 1 },
});

export default CycleHero;
