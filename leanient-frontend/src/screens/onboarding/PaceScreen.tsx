import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { BigNum } from "../../components/ui/BigNum";
import { Slider } from "../../components/ui/Slider";
import { Persona } from "../../components/ui/Persona";
import { CoachPill } from "../../components/ui/CoachPill";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../context/OnboardingContext";
import { PACE_OPTIONS } from "../../onboarding/options";
import {
  defaultPace,
  formatLongDate,
  formatPace,
  paceBucketIndex,
  paceForBucket,
  paceRange,
  projectTargetDate,
} from "../../onboarding/pace";
import { DEFAULT_WEIGHT_LB } from "../../onboarding/units";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface PaceScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function PaceScreen({ onBack, onContinue }: PaceScreenProps) {
  const { draft, setProfile } = useOnboarding();

  const unit = draft.initialWeight?.unit ?? draft.profile.goalWeightUnit ?? "lb";
  const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
  const goalWeight = draft.profile.goalWeight ?? currentWeight;
  const range = useMemo(() => paceRange(unit), [unit]);
  const now = useRef(new Date()).current;

  const [pace, setPace] = useState(() => defaultPace(unit));

  const bucket = paceBucketIndex(pace, range);
  const persona = PACE_OPTIONS[bucket];

  const toLose = Math.max(0, currentWeight - goalWeight);
  const targetDate = projectTargetDate(toLose, pace, now);
  const helper =
    toLose > 0
      ? `Reaching ${goalWeight} ${unit} by ${formatLongDate(targetDate)}`
      : `You're already at your goal weight`;

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);

  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const handleContinue = () => {
    setProfile({ goalPace: persona.value });
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.8} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>How fast do you want to get there?</Text>
            <Text style={styles.sub}>Faster isn't better here. Muscle holds up better at a slower cut.</Text>
          </View>

          <View style={styles.personas}>
            {PACE_OPTIONS.map((p, i) => (
              <Persona
                key={p.value}
                label={p.label}
                chevrons={p.chevrons}
                selected={i === bucket}
                onPress={() => setPace(paceForBucket(i, range))}
              />
            ))}
          </View>

          <View style={styles.readout}>
            <Eyebrow>TARGET PACE</Eyebrow>
            <BigNum value={formatPace(pace, range)} unit={`${unit}/wk`} size={64} unitSize={22} />
            <Text style={styles.helper}>{helper}</Text>
          </View>

          <View style={styles.sliderBlock}>
            <Slider min={range.min} max={range.max} step={range.step} value={pace} onChange={setPace} />
            <View style={styles.marks}>
              <Text style={styles.mark}>
                {formatPace(range.min, range)} {unit}/wk
              </Text>
              <Text style={styles.mark}>
                {formatPace(range.max, range)} {unit}/wk
              </Text>
            </View>
          </View>

          <View style={styles.coachWrap}>
            <CoachPill>{persona.coach}</CoachPill>
          </View>

          <View style={styles.spacer} />

          <Button label="Continue" onPress={handleContinue} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  titleBlock: { marginBottom: 8 },
  h1: {
    fontFamily: font.extrabold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75,
    color: colors.ink,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.16,
    color: colors.muted,
    marginTop: 10,
  },
  personas: { flexDirection: "row", gap: 10, marginTop: 22 },
  readout: { alignItems: "center", gap: 6, marginTop: 26 },
  helper: {
    fontFamily: font.medium,
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.muted,
  },
  sliderBlock: { marginTop: 24, gap: 14 },
  marks: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  mark: { fontFamily: font.medium, fontSize: 13, color: colors.faint },
  coachWrap: { marginTop: 18 },
  spacer: { flex: 1, minHeight: 12 },
});

export default PaceScreen;
