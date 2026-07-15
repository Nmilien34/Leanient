import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { useOnboarding } from "../../context/OnboardingContext";
import { PACE_OPTIONS } from "../../onboarding/options";
import {
  formatPace,
  formatShortDate,
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

/**
 * Frame 12 of the onboarding conversation: three pace cards, steady
 * pre-selected as the muscle-safe sweet spot carrying THEIR landing date.
 * Ambitious warns gently instead of forbidding. Only the `goalPace` bucket is
 * stored; the weekly rates and the date are display-only projections.
 */
export function PaceScreen({ onBack, onContinue }: PaceScreenProps) {
  const { draft, setProfile } = useOnboarding();

  const unit = draft.initialWeight?.unit ?? draft.profile.goalWeightUnit ?? "lb";
  const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
  const goalWeight = draft.profile.goalWeight ?? currentWeight;
  const range = useMemo(() => paceRange(unit), [unit]);
  const now = useRef(new Date()).current;

  // Steady pre-selected: the muscle-safe default.
  const [bucket, setBucket] = useState(1);

  const toLose = Math.max(0, currentWeight - goalWeight);

  const rateLabel = (i: number) => `${formatPace(paceForBucket(i, range), range)} ${unit} / week`;
  const subFor = (i: number) => {
    const base = PACE_OPTIONS[i].sub;
    if (i === 1 && toLose > 0) {
      const landing = formatShortDate(projectTargetDate(toLose, paceForBucket(1, range), now));
      return `${base} Lands you at ${goalWeight} by ${landing}.`;
    }
    return base;
  };

  const pick = (i: number) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setBucket(i);
  };

  const handleContinue = () => {
    setProfile({ goalPace: PACE_OPTIONS[bucket].value });
    onContinue?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("pace")}
      onBack={onBack}
      context={`${goalWeight} ${unit}. I like it.`}
      question="How fast do you want to get there?"
      footer={<ConvoButton label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.cards}>
        {PACE_OPTIONS.map((p, i) => {
          const on = i === bucket;
          return (
            <Pressable
              key={p.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}, ${rateLabel(i)}`}
              onPress={() => pick(i)}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, on && styles.cardTitleOn]}>{p.label}</Text>
                <Text style={[styles.cardRate, on && styles.cardRateOn]}>{rateLabel(i)}</Text>
              </View>
              <Text style={[styles.cardSub, on && styles.cardSubOn]}>{subFor(i)}</Text>
            </Pressable>
          );
        })}
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 10, marginTop: 26 },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: ink.chipBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  cardOn: { backgroundColor: "rgba(47,184,122,0.14)", borderColor: ink.emerald },
  cardTop: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  cardTitle: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.25, color: ink.bright },
  cardTitleOn: { color: ink.emeraldHi },
  cardRate: { fontFamily: font.semibold, fontSize: 12.5, color: ink.faint },
  cardRateOn: { color: ink.soft },
  cardSub: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.soft },
  cardSubOn: { color: ink.bright },
});

export default PaceScreen;
