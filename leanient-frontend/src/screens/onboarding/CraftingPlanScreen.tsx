import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { RadialGlow } from "../../components/layout/RadialGlow";
import { BackButton } from "../../components/ui/BackButton";
import { useOnboarding } from "../../context/OnboardingContext";
import { buildPlanPreview } from "../../onboarding/planPreview";
import { DAY_LABEL } from "../../onboarding/belonging";
import { colors } from "../../theme/tokens";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 80;
const C = 2 * Math.PI * R; // 502.65
// Step completion points (matches the StepDef thresholds below) — each crossing
// fires a haptic tick so the build is felt, piece by piece.
const STEP_THRESHOLDS = [18, 38, 58, 78, 96];
// Beat after the ring hits 100% before advancing.
const HOLD_MS = 900;

// ---- chip icons (white strokes/fills, from the prototype) ----
function DropIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" fill="#fff" />
    </Svg>
  );
}
function DumbbellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
      <Path d="M5 9v6M19 9v6M8 7v10M16 7v10M8 12h8" />
    </Svg>
  );
}
function CalendarIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9h16M8 3v4M16 3v4" />
      <Path d="M4 5h16v16H4z" />
    </Svg>
  );
}
function FlagIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 21V4M6 4h11l-2 4 2 4H6" />
    </Svg>
  );
}
function PenIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3l4 4L8 20l-5 1 1-5z" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={13} height={10} viewBox="0 0 12 9" fill="none">
      <Path d="M1 4.5L4.2 7.5L11 1" stroke="#F4F8EF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type StepState = "done" | "now" | "wait";

/** Spinning ring for the "in-progress" step indicator. */
function Spinner() {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />;
}

function StepEnd({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <View style={styles.endDone}>
        <CheckIcon />
      </View>
    );
  }
  if (state === "now") return <Spinner />;
  return <View style={styles.endWait} />;
}

interface StepDef {
  gradient: readonly [string, string];
  icon: React.ReactNode;
  threshold: number;
  label: string;
  /** Muted personalized detail after the label, e.g. "shot Saturdays". */
  sub?: string;
}

function StepRow({ step, state, index }: { step: StepDef; state: StepState; index: number }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 500,
      delay: 80 * index,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [rise, index]);

  const riseStyle = {
    opacity: Animated.multiply(rise, state === "wait" ? 0.55 : 1),
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  return (
    <Animated.View style={[styles.step, riseStyle]}>
      <LinearGradient colors={step.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.chip}>
        {step.icon}
      </LinearGradient>
      <Text style={[styles.stepText, state === "wait" && styles.stepTextWait]}>
        {step.label}
        {step.sub ? <Text style={styles.stepSub}> · {step.sub}</Text> : null}
      </Text>
      <StepEnd state={state} />
    </Animated.View>
  );
}

interface CraftingPlanScreenProps {
  onDone?: () => void;
  /** Step back to tweak answers; the plan re-crafts on return (screen remounts). */
  onBack?: () => void;
}

export function CraftingPlanScreen({ onDone, onBack }: CraftingPlanScreenProps) {
  const { draft } = useOnboarding();
  const now = useRef(new Date()).current;

  // Their answers visibly become their plan (onboarding-v2 frame 14): every
  // row carries the personalized value it locked in. The protein number comes
  // from the same client-side preview the paywall shows.
  const plan = useMemo(() => buildPlanPreview(draft, now), [draft, now]);
  const steps: StepDef[] = useMemo(() => {
    const medName = draft.medicationProtocol.medicationName;
    const shotDays = (draft.medicationProtocol.shotDays ?? []).map((d) => DAY_LABEL[d]).filter(Boolean);
    const proteinSub = `${plan.dailyProteinLabel.replace(" g", "g")} a day`;
    return [
      {
        gradient: ["#F0C079", "#D08E45"],
        icon: <CalendarIcon />,
        threshold: 18,
        label: medName ? `Mapped your ${medName} week` : "Mapped your week",
        sub: shotDays.length ? `shot ${shotDays.join(" + ")}` : undefined,
      },
      { gradient: ["#6FE0A6", "#23A869"], icon: <DropIcon />, threshold: 38, label: "Protein target set", sub: proteinSub },
      { gradient: ["#3FCB86", "#1F9E63"], icon: <DumbbellIcon />, threshold: 58, label: "Training placed on your strong days", sub: "day 2 + 3" },
      { gradient: ["#8FE8B5", "#2FB87A"], icon: <FlagIcon />, threshold: 78, label: "Defense days planned", sub: "day 5 + 6" },
      { gradient: ["#6FE0A6", "#1F9E63"], icon: <PenIcon />, threshold: 96, label: "Writing week one…" },
    ];
  }, [draft.medicationProtocol.medicationName, draft.medicationProtocol.shotDays, plan.dailyProteinLabel]);

  const progress = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const [pct, setPct] = useState(0);
  const lastPct = useRef(0);

  // Keep onDone in a ref so the one-shot animation effect runs on mount only —
  // not restarted when the parent re-renders with a new inline onDone identity.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // bouncy entrance for the ring
    Animated.spring(entrance, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    // gentle float loop
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    float.start();

    const listener = progress.addListener(({ value }) => {
      const p = Math.round(value);
      if (p !== lastPct.current) {
        // Each completed build step lands with a physical tick, so the plan
        // feels assembled piece by piece rather than watched.
        if (Platform.OS !== "web") {
          const crossed = STEP_THRESHOLDS.some((t) => lastPct.current < t && p >= t);
          if (crossed) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
        lastPct.current = p;
        setPct(p);
      }
    });

    let doneTimer: ReturnType<typeof setTimeout>;
    // Staged fill so each step feels like real work rather than one smooth sweep.
    // It climbs, pausing as each step completes, then deliberately HOLDS at ~90%
    // while step 4 ("Locking your goal date") spins — the "we're really building
    // your goal" beat — before finishing to 100%.
    const seg = (toValue: number, duration: number, easing = Easing.inOut(Easing.ease)) =>
      Animated.timing(progress, { toValue, duration, easing, useNativeDriver: false });
    const fill = Animated.sequence([
      seg(24, 560), // protein target
      Animated.delay(220),
      seg(48, 560), // starter workouts
      Animated.delay(220),
      seg(72, 620), // shot-day calibration (step 4 starts spinning here)
      Animated.delay(280),
      seg(90, 680), // goal date — climbing while "Locking…" spins
      Animated.delay(1200), // <-- the real-work beat before the goal locks in
      seg(100, 640, Easing.out(Easing.cubic)), // crosses 96 → step 4 checks → 100%
    ]);
    // INTEGRATION POINT: run the real submission alongside this animation: gate the
    // final seg(100) / onDone on submit() resolving (success advances; failure shows
    // an error state, Rule 7). The backend computes the targets on submit. For now
    // the ring completes on its own and advances, never an infinite loop.
    fill.start(({ finished }) => {
      if (finished) {
        doneTimer = setTimeout(() => onDoneRef.current?.(), HOLD_MS);
      }
    });

    return () => {
      float.stop();
      fill.stop();
      progress.removeListener(listener);
      clearTimeout(doneTimer);
    };
    // mount-only: the ring runs once and advances; onDone is read via ref
  }, []);

  // derive step states from the live percentage
  let activeAssigned = false;
  const stepStates: StepState[] = steps.map((s) => {
    if (pct >= s.threshold) return "done";
    if (!activeAssigned) {
      activeAssigned = true;
      return "now";
    }
    return "wait";
  });

  const dashoffset = progress.interpolate({ inputRange: [0, 100], outputRange: [C, 0] });
  const ringStyle = {
    opacity: entrance,
    transform: [
      { translateY: floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
      { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {onBack ? (
          <View style={styles.backRow}>
            <BackButton onPress={onBack} />
          </View>
        ) : null}
        <View style={styles.body}>
          <View style={styles.topGroup}>
            <Animated.View style={[styles.ringWrap, ringStyle]}>
              <RadialGlow
                size={150}
                position={{ top: 23, left: 23 }}
                pulse
                pulseDuration={4000}
                stops={[
                  { offset: 0, color: "#8FD29A", opacity: 0.5 },
                  { offset: 0.55, color: "#86BBD8", opacity: 0.25 },
                  { offset: 0.72, color: "#86BBD8", opacity: 0 },
                ]}
              />
              <Svg width={184} height={184} viewBox="0 0 184 184" style={styles.ringSvg}>
                <Defs>
                  <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#6FE0A6" />
                    <Stop offset="52%" stopColor="#2FB87A" />
                    <Stop offset="100%" stopColor="#E3A65E" />
                  </SvgGradient>
                </Defs>
                <Circle cx={92} cy={92} r={R} stroke="rgba(238,244,234,0.12)" strokeWidth={16} fill="none" />
                <AnimatedCircle
                  cx={92}
                  cy={92}
                  r={R}
                  stroke="url(#ringGrad)"
                  strokeWidth={16}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={C}
                  strokeDashoffset={dashoffset}
                  transform="rotate(-90 92 92)"
                />
              </Svg>
              <View style={styles.pct} pointerEvents="none">
                <View style={styles.pctRow}>
                  <Text style={styles.pctNum}>{pct}</Text>
                  <Text style={styles.pctSup}>%</Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.textGroup}>
              <Text style={styles.h1}>Building your plan.</Text>
              <Text style={styles.sub}>Tuned to your shot, your pace, and the muscle you want to keep.</Text>
            </View>
          </View>

          <View style={styles.steps}>
            {steps.map((s, i) => (
              <StepRow key={s.threshold} step={s} index={i} state={stepStates[i]} />
            ))}
          </View>

          <Text style={styles.credibility}>
            Built on 40+ clinical sources. Every number in your plan is cited inside the app.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ink.ground },
  safe: { flex: 1 },
  backRow: { paddingHorizontal: 24, paddingTop: 10 },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 44,
    paddingHorizontal: 24,
    // pull the centered cluster up so the back button doesn't shift it down
    marginTop: -50,
  },
  topGroup: { alignItems: "center", gap: 28 },
  ringWrap: { width: 196, height: 196, alignItems: "center", justifyContent: "center" },
  ringSvg: { position: "absolute" },
  pct: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  pctRow: { flexDirection: "row", alignItems: "flex-start" },
  pctNum: {
    fontFamily: font.light,
    fontWeight: "300",
    fontSize: 54,
    letterSpacing: -1.62,
    color: ink.bright,
    fontVariant: ["tabular-nums"],
    lineHeight: 54,
  },
  pctSup: {
    fontFamily: font.regular,
    fontSize: 24,
    lineHeight: 26,
    color: ink.soft,
    marginLeft: 2,
  },
  textGroup: { alignItems: "center", gap: 8 },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 26,
    letterSpacing: -0.65,
    color: ink.bright,
    textAlign: "center",
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
    color: ink.soft,
    textAlign: "center",
  },
  steps: { alignSelf: "stretch", gap: 12 },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: ink.bubbleGround,
    borderWidth: 1,
    borderColor: ink.bubbleLine,
    shadowColor: "rgba(24,28,24,1)",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14.5,
    lineHeight: 19,
    letterSpacing: -0.145,
    color: ink.bright,
  },
  stepTextWait: { color: ink.soft },
  stepSub: { fontFamily: font.medium, color: ink.soft },
  credibility: {
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: ink.dim,
    textAlign: "center",
    marginTop: 22,
    paddingHorizontal: 12,
  },
  endDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.emerald,
    shadowColor: colors.emeraldDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.6,
    elevation: 3,
  },
  endWait: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: ink.chipBorder,
  },
  spinner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: ink.emeraldHi,
    borderRightColor: "transparent",
  },
});

export default CraftingPlanScreen;
