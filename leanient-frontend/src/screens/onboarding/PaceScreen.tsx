import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { Slider } from "../../components/ui/Slider";
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
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

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
      : "You're already at your goal weight";

  const pickBucket = (i: number) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPace(paceForBucket(i, range));
  };

  const handleContinue = () => {
    setProfile({ goalPace: persona.value });
    onContinue?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("pace")}
      onBack={onBack}
      context={`${goalWeight} ${unit}. I like it.`}
      question="How fast do you want to get there?"
      sub="Faster asks more of your muscle. Steady is the sweet spot."
      footer={<ConvoButton label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.personas}>
        {PACE_OPTIONS.map((p, i) => {
          const on = i === bucket;
          return (
            <Pressable
              key={p.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.label}
              onPress={() => pickBucket(i)}
              style={[styles.persona, on && styles.personaOn]}
            >
              <Text style={[styles.personaChevrons, on && styles.personaChevronsOn]}>{p.chevrons}</Text>
              <Text style={[styles.personaText, on && styles.personaTextOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.readout}>
        <Text style={styles.paceNum}>
          {formatPace(pace, range)} <Text style={styles.paceUnit}>{unit}/wk</Text>
        </Text>
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
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  personas: { flexDirection: "row", gap: 8, marginTop: 26 },
  persona: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: "center",
    gap: 3,
    borderWidth: 1.5,
    borderColor: ink.chipBorder,
  },
  personaOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  personaChevrons: { fontFamily: font.bold, fontSize: 13, color: ink.faint },
  personaChevronsOn: { color: ink.onEmerald },
  personaText: { fontFamily: font.semibold, fontSize: 13.5, color: ink.chipText },
  personaTextOn: { fontFamily: font.bold, color: ink.onEmerald },
  readout: { marginTop: 26 },
  paceNum: { fontFamily: font.extrabold, fontSize: 52, letterSpacing: -1.82, color: ink.bright },
  paceUnit: { fontFamily: font.semibold, fontSize: 20, color: ink.soft },
  helper: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, color: ink.emeraldHi, marginTop: 8 },
  sliderBlock: { marginTop: 20 },
  marks: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  mark: { fontFamily: font.semibold, fontSize: 12, color: ink.faint },
});

export default PaceScreen;
