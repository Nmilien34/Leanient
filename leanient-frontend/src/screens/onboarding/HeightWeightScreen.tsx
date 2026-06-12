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
  // Value + unit live together so a measurement can never carry the wrong
  // label. The wheels report through scroll events, and a kg wheel that is
  // still settling when the user toggles back to Imperial can deliver its
  // value after the conversion ran; a 270 lb user then continued with 122
  // ("kg") stamped as lb and the goal slider capped at 122 lb. Converting
  // from the pair's own unit (and dropping events from a wheel rendered in a
  // stale unit) closes both orderings of that race.
  const [height, setHeightSel] = useState({ value: DEFAULT_HEIGHT_IN, unit: heightUnitFor("imperial") });
  const [weight, setWeightSel] = useState({ value: DEFAULT_WEIGHT_LB, unit: weightUnitFor("imperial") });

  const heightUnit = heightUnitFor(system);
  const weightUnit = weightUnitFor(system);
  const heightItems = useMemo(() => buildHeightItems(heightUnit), [heightUnit]);
  const weightItems = useMemo(() => buildWeightItems(weightUnit), [weightUnit]);

  const handleHeightChange = (value: number) =>
    setHeightSel((prev) => (prev.unit === heightUnit ? { value, unit: heightUnit } : prev));
  const handleWeightChange = (value: number) =>
    setWeightSel((prev) => (prev.unit === weightUnit ? { value, unit: weightUnit } : prev));

  const handleSystemChange = (next: UnitSystem) => {
    if (next === system) return;
    setHeightSel((prev) => ({ value: convertHeight(prev.value, prev.unit, heightUnitFor(next)), unit: heightUnitFor(next) }));
    setWeightSel((prev) => ({ value: convertWeight(prev.value, prev.unit, weightUnitFor(next)), unit: weightUnitFor(next) }));
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
    // Current weight → the shared `initialWeight` contract (measuredAt filled at
    // submit). Saved from the pairs, so value and unit always travel together.
    setInitialWeight({ value: weight.value, unit: weight.unit });
    // Height has no backend field yet → frontend-only basics slice (see TODO doc).
    setBasics({ heightValue: height.value, heightUnit: height.unit });
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
                value={height.value}
                onChange={handleHeightChange}
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
                value={weight.value}
                onChange={handleWeightChange}
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
