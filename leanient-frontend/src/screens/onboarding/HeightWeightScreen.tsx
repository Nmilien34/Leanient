import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { Wheel } from "../../components/ui/Wheel";
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
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

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
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setHeightSel((prev) => ({ value: convertHeight(prev.value, prev.unit, heightUnitFor(next)), unit: heightUnitFor(next) }));
    setWeightSel((prev) => ({ value: convertWeight(prev.value, prev.unit, weightUnitFor(next)), unit: weightUnitFor(next) }));
    setSystem(next);
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
    <ConvoScreen
      progress={onboardingProgress("heightWeight")}
      onBack={onBack}
      context="Thanks for trusting me with the basics."
      question="Your starting point."
      sub="This stays private. It's the baseline we measure progress against."
      footer={<ConvoButton label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.segRow}>
        {SYSTEM_OPTIONS.map((o) => {
          const on = system === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => handleSystemChange(o.value)}
              style={[styles.seg, on && styles.segOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.eyebrow}>HEIGHT</Text>
          <View style={styles.panel}>
            <Wheel
              key={`height-${heightUnit}`}
              items={heightItems}
              value={height.value}
              onChange={handleHeightChange}
              height={220}
              fontSize={20}
              centerScale={1.3}
            />
          </View>
        </View>
        <View style={styles.col}>
          <Text style={styles.eyebrow}>WEIGHT</Text>
          <View style={styles.panel}>
            <Wheel
              key={`weight-${weightUnit}`}
              items={weightItems}
              value={weight.value}
              onChange={handleWeightChange}
              height={220}
              fontSize={20}
              centerScale={1.3}
            />
          </View>
        </View>
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  segRow: { flexDirection: "row", gap: 10, marginTop: 26 },
  seg: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: ink.chipBorder,
  },
  segOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  segText: { fontFamily: font.semibold, fontSize: 14.5, color: ink.chipText },
  segTextOn: { fontFamily: font.bold, color: ink.onEmerald },
  row: { flexDirection: "row", gap: 10, marginTop: 22 },
  col: { flex: 1 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.99, color: ink.faint, marginBottom: 10 },
  panel: { borderRadius: 20, backgroundColor: colors.paper, paddingVertical: 8, paddingHorizontal: 8 },
});

export default HeightWeightScreen;
