import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Wheel } from "../../components/ui/Wheel";
import { Toggle } from "../../components/ui/Toggle";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  buildHeightItems,
  buildWeightItems,
  convertHeight,
  convertWeight,
  DEFAULT_HEIGHT_IN,
  DEFAULT_WEIGHT_LB,
  heightUnitFor,
  weightUnitFor,
  type UnitSystem,
} from "../../onboarding/units";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const RISE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

const SYSTEM_OPTIONS = [
  { label: "Imperial", value: "imperial" as UnitSystem },
  { label: "Metric", value: "metric" as UnitSystem },
];

interface HeightWeightScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function HeightWeightScreen({ onBack, onContinue }: HeightWeightScreenProps) {
  const { setInitialWeight, setBasics } = useOnboarding();

  const [system, setSystem] = useState<UnitSystem>("imperial");
  const [height, setHeight] = useState(DEFAULT_HEIGHT_IN); // in current height unit
  const [weight, setWeight] = useState(DEFAULT_WEIGHT_LB); // in current weight unit

  const heightUnit = heightUnitFor(system);
  const weightUnit = weightUnitFor(system);
  const heightItems = useMemo(() => buildHeightItems(heightUnit), [heightUnit]);
  const weightItems = useMemo(() => buildWeightItems(weightUnit), [weightUnit]);

  const handleSystemChange = (next: UnitSystem) => {
    if (next === system) return;
    const fromH = heightUnitFor(system);
    const fromW = weightUnitFor(system);
    setHeight((h) => convertHeight(h, fromH, heightUnitFor(next)));
    setWeight((w) => convertWeight(w, fromW, weightUnitFor(next)));
    setSystem(next);
  };

  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 520, easing: RISE_EASE, useNativeDriver: true }).start();
  }, [rise]);

  const bodyStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  const handleContinue = () => {
    // Current weight → the shared `initialWeight` contract (measuredAt filled at submit).
    setInitialWeight({ value: weight, unit: weightUnit });
    // Height has no backend field yet → frontend-only basics slice (see TODO doc).
    setBasics({ heightValue: height, heightUnit });
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenHeader progress={0.6} onBack={onBack} />

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>Your starting point.</Text>
            <Text style={styles.sub}>
              We'll keep this private. It's the baseline we measure progress against.
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Eyebrow style={styles.eyebrow}>HEIGHT</Eyebrow>
              <Wheel
                key={`height-${heightUnit}`}
                items={heightItems}
                value={height}
                onChange={setHeight}
                height={240}
                fontSize={20}
                centerScale={1.3}
              />
            </View>
            <View style={styles.col}>
              <Eyebrow style={styles.eyebrow}>WEIGHT</Eyebrow>
              <Wheel
                key={`weight-${weightUnit}`}
                items={weightItems}
                value={weight}
                onChange={setWeight}
                height={240}
                fontSize={20}
                centerScale={1.3}
              />
            </View>
          </View>

          <View style={styles.toggleWrap}>
            <Toggle options={SYSTEM_OPTIONS} value={system} onChange={handleSystemChange} />
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
  row: { flexDirection: "row", gap: 14, marginTop: 30 },
  col: { flex: 1, gap: 12 },
  eyebrow: { textAlign: "center" },
  toggleWrap: { marginTop: 20 },
  spacer: { flex: 1, minHeight: 18 },
});

export default HeightWeightScreen;
