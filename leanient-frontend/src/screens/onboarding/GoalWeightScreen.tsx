import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { BigNum } from "../../components/ui/BigNum";
import { Slider } from "../../components/ui/Slider";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../context/OnboardingContext";
import { goalWeightRange, DEFAULT_WEIGHT_LB } from "../../onboarding/units";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

interface GoalWeightScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function GoalWeightScreen({ onBack, onContinue }: GoalWeightScreenProps) {
  const { draft, setProfile } = useOnboarding();

  // Current weight comes from the previous screen (initialWeight). Fall back to a
  // default so the screen still renders if reached directly in dev.
  const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
  const unit = draft.initialWeight?.unit ?? "lb";
  const range = useMemo(() => goalWeightRange(currentWeight, unit), [currentWeight, unit]);

  const [goal, setGoal] = useState(range.initial);

  const diff = currentWeight - goal;
  const helper =
    diff > 0
      ? `${diff} ${unit} below where you are today`
      : `Your current weight`;

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);

  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const handleContinue = () => {
    setProfile({ goalWeight: goal, goalWeightUnit: unit });
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.72} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>Where do you want to land?</Text>
            <Text style={styles.sub}>Set the weight you want to hold long-term. Not a temporary number.</Text>
          </View>

          <View style={styles.readout}>
            <Eyebrow>GOAL WEIGHT</Eyebrow>
            <BigNum value={String(goal)} unit={unit} />
            <Text style={styles.helper}>{helper}</Text>
          </View>

          <View style={styles.sliderBlock}>
            <Slider min={range.min} max={range.max} value={goal} onChange={setGoal} />
            <View style={styles.marks}>
              <Text style={styles.mark}>
                {range.min} {unit}
              </Text>
              <Text style={styles.mark}>
                {range.max} {unit}
              </Text>
            </View>
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
  readout: { alignItems: "center", gap: 6, marginTop: 48 },
  helper: {
    fontFamily: font.medium,
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.muted,
  },
  sliderBlock: { marginTop: 44, gap: 14 },
  marks: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  mark: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.faint,
  },
  spacer: { flex: 1, minHeight: 18 },
});

export default GoalWeightScreen;
