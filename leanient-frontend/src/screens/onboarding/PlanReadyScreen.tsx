import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { useOnboarding } from "../../context/OnboardingContext";
import { PACE_OPTIONS } from "../../onboarding/options";
import { paceForBucket, paceRange, projectTargetDate, formatLongDate } from "../../onboarding/pace";
import { buildPlanPreview } from "../../onboarding/planPreview";
import { DEFAULT_WEIGHT_LB } from "../../onboarding/units";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Graph geometry (viewBox 0 0 322 150): a gentle descent from today to goal.
const CURVE = "M14 22 C 90 40, 190 78, 296 118";
const CURVE_LENGTH = 320; // safely >= real path length for the dash trick
const DRAW_MS = 1600;

const CONFETTI_COLORS = ["#2FB87A", "#6FE0A6", "#E3A65E", "#1F9E63", "#F0C079"];
const CONFETTI_COUNT = 26;

/** One falling confetto: drops with drift + spin, fading near the floor. */
function Confetto({ index, screenW }: { index: number; screenW: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  const startX = useMemo(() => Math.random() * screenW, [screenW]);
  const drift = useMemo(() => (Math.random() - 0.5) * 90, []);
  const size = useMemo(() => 7 + Math.random() * 6, []);
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const spin = useMemo(() => `${Math.round((Math.random() - 0.5) * 720)}deg`, []);

  useEffect(() => {
    Animated.timing(fall, {
      toValue: 1,
      duration: 1700 + Math.random() * 900,
      delay: index * 28,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fall, index]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -24,
        left: startX,
        width: size,
        height: size * 1.5,
        borderRadius: 2,
        backgroundColor: color,
        opacity: fall.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 560] }) },
          { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", spin] }) },
        ],
      }}
    />
  );
}

interface PlanReadyScreenProps {
  onContinue?: () => void;
}

/**
 * The lights come on: after the dark conversation, the paper app appears and
 * the goal path draws itself from today's weight down to the goal, the flag
 * pops, confetti falls, and the plan is declared ready. Pure celebration, one
 * button out (the paywall follows).
 */
export function PlanReadyScreen({ onContinue }: PlanReadyScreenProps) {
  const { draft } = useOnboarding();
  const now = useRef(new Date()).current;
  const { width: screenW } = useWindowDimensions();

  const view = useMemo(() => {
    const unit = draft.initialWeight?.unit ?? draft.profile.goalWeightUnit ?? "lb";
    const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
    const goalWeight = draft.profile.goalWeight ?? currentWeight;
    const goalPace = draft.profile.goalPace ?? "steady";
    const bucket = Math.max(0, PACE_OPTIONS.findIndex((p) => p.value === goalPace));
    const rate = paceForBucket(bucket, paceRange(unit));
    const toLose = Math.max(0, currentWeight - goalWeight);
    const goalDate = formatLongDate(projectTargetDate(toLose, rate, now));
    const shotDays = draft.medicationProtocol.shotDays ?? [];
    return { unit, currentWeight, goalWeight, goalDate, toLose, shotDayCount: shotDays.length };
  }, [draft, now]);
  // Same client-side preview the crafting rows and paywall use.
  const plan = useMemo(() => buildPlanPreview(draft, now), [draft, now]);

  const draw = useRef(new Animated.Value(0)).current;
  const flagPop = useRef(new Animated.Value(0)).current;
  const titleRise = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    Animated.sequence([
      // the card eases in, then the line draws its way to the goal
      Animated.timing(cardRise, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(draw, { toValue: 1, duration: DRAW_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      // the goal flag lands
      Animated.spring(flagPop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setCelebrate(true);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Animated.timing(titleRise, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
    // mount-only celebration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashoffset = draw.interpolate({ inputRange: [0, 1], outputRange: [CURVE_LENGTH, 0] });
  const cardStyle = {
    opacity: cardRise,
    transform: [{ translateY: cardRise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
  const titleStyle = {
    opacity: titleRise,
    transform: [{ translateY: titleRise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };
  const flagStyle = {
    opacity: flagPop,
    transform: [{ scale: flagPop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Animated.View style={titleStyle}>
            <Text style={styles.h1}>
              Your plan is ready<Text style={{ color: colors.emeraldDeep }}>.</Text>
            </Text>
            <Text style={styles.sub}>Tuned to your med, your week, your goal.</Text>
          </Animated.View>

          <Animated.View style={[styles.card, cardStyle]}>
            <Text style={styles.eyebrow}>
              GOAL PATH · <Text style={{ color: colors.emeraldDeep }}>{view.goalWeight} {view.unit.toUpperCase()} BY {view.goalDate.toUpperCase()}</Text>
            </Text>
            <Svg width="100%" height={150} viewBox="0 0 322 150" style={styles.graph}>
              <Defs>
                <SvgGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#6FE0A6" />
                  <Stop offset="100%" stopColor="#1F9E63" />
                </SvgGradient>
              </Defs>
              {/* the faint full route, then the animated draw on top */}
              <Path d={CURVE} stroke={colors.line} strokeWidth={2} strokeDasharray="5 7" fill="none" />
              <AnimatedPath
                d={CURVE}
                stroke="url(#pathGrad)"
                strokeWidth={3.5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CURVE_LENGTH}
                strokeDashoffset={dashoffset}
              />
              <Circle cx={14} cy={22} r={5.5} fill={colors.faint} stroke="#fff" strokeWidth={2.5} />
            </Svg>
            <Text style={[styles.graphLabel, { top: 4, left: 26 }]}>
              {view.currentWeight} {view.unit} today
            </Text>
            <Animated.View style={[styles.flagWrap, flagStyle]}>
              <View style={styles.flag}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.amberDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6 21V4M6 4h11l-2 4 2 4H6" />
                </Svg>
              </View>
              <Text style={styles.flagLabel}>
                {view.goalWeight} {view.unit} · muscle kept
              </Text>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.chips, titleStyle]}>
            <View style={[styles.chip, styles.chipEm]}>
              <Text style={[styles.chipText, styles.chipTextEm]}>{plan.dailyProteinLabel.replace(" g", "g")} protein / day</Text>
            </View>
            <View style={[styles.chip, styles.chipEm]}>
              <Text style={[styles.chipText, styles.chipTextEm]}>{plan.workoutsLabel.replace(" session", " short session")}</Text>
            </View>
            {view.shotDayCount > 0 ? (
              <>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>shot day = reset day</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>days 5-6 defended</Text>
                </View>
              </>
            ) : null}
          </Animated.View>

          <Animated.View style={[styles.promise, titleStyle]}>
            <View style={styles.promiseDot}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
                <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
              </Svg>
            </View>
            <Text style={styles.promiseText}>Your coach checks in every morning and answers anything, anytime.</Text>
          </Animated.View>

          <View style={styles.spacer} />

          <Animated.View style={titleStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See my full plan"
              onPress={onContinue}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaText}>See my full plan</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>

      {celebrate ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
            <Confetto key={i} index={i} screenW={screenW} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 24 },
  h1: { fontFamily: font.extrabold, fontSize: 29, lineHeight: 34, letterSpacing: -0.81, color: colors.ink },
  sub: { fontFamily: font.medium, fontSize: 14.5, lineHeight: 20, color: colors.muted, marginTop: 8 },
  card: {
    marginTop: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    shadowOpacity: 0.09,
    elevation: 4,
  },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  graph: { marginTop: 10 },
  graphLabel: { position: "absolute", fontFamily: font.bold, fontSize: 11, color: colors.muted, marginTop: 40 },
  flagWrap: { position: "absolute", right: 14, bottom: 14, alignItems: "flex-end" },
  flag: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F7ECDB",
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  flagLabel: { fontFamily: font.extrabold, fontSize: 11.5, color: colors.emeraldDeep, marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16 },
  chip: { backgroundColor: colors.sageFill, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 10 },
  chipEm: { backgroundColor: "rgba(47,184,122,0.12)" },
  chipText: { fontFamily: font.bold, fontSize: 12.5, color: colors.muted },
  chipTextEm: { color: colors.emeraldDeep },
  promise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  promiseDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  promiseText: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, color: colors.ink },
  spacer: { flex: 1, minHeight: 16 },
  cta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.emeraldDeep,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    shadowOpacity: 0.35,
    elevation: 5,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontFamily: font.bold, fontSize: 16.5, letterSpacing: -0.17, color: "#F4FBF7" },
});

export default PlanReadyScreen;
