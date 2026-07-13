import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { useOnboarding } from "../../context/OnboardingContext";
import { ENERGY_OPTIONS } from "../../onboarding/options";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface EnergyRealityScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * "How are you feeling on it?" — the question only people on the med get
 * asked. Multi-select (so it keeps a Continue footer per the conversation
 * rules), persisting profile.sideEffectBaseline.
 */
export function EnergyRealityScreen({ onBack, onContinue }: EnergyRealityScreenProps) {
  const { draft, setProfile } = useOnboarding();
  // Restore the user's previous picks when they come back to re-tweak; a first
  // visit starts empty so every selection is a real answer.
  const [selected, setSelected] = useState<number[]>(() => {
    const persisted = draft.profile.sideEffectBaseline;
    if (!persisted) return [];
    return persisted
      .map((key) => ENERGY_OPTIONS.findIndex((o) => o.key === key))
      .filter((i) => i >= 0);
  });

  const toggle = (i: number) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelected((prev) => {
      const opt = ENERGY_OPTIONS[i];
      const has = prev.includes(i);
      if (opt.exclusive) {
        // "I feel fine" is exclusive: selecting it clears everything else.
        return has ? [] : [i];
      }
      // Any concern deselects the exclusive sentinel.
      const base = prev.filter((idx) => !ENERGY_OPTIONS[idx].exclusive);
      return has ? base.filter((idx) => idx !== i) : [...base, i];
    });
  };

  const handleContinue = () => {
    const baseline = selected
      .map((i) => ENERGY_OPTIONS[i].key)
      .filter((k): k is string => k !== null);
    setProfile({ sideEffectBaseline: baseline });
    onContinue?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("energyReality")}
      onBack={onBack}
      context="Here's a question only people like us ask."
      question="How are you feeling on it?"
      sub="Pick everything that fits. This stays between us."
      footer={<ConvoButton label="Continue" disabled={selected.length === 0} onPress={handleContinue} />}
    >
      <View style={styles.chips}>
        {ENERGY_OPTIONS.map((option, i) => {
          const on = selected.includes(i);
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => toggle(i)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingTop: 26 },
  chip: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: ink.chipBorder },
  chipOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  chipText: { fontFamily: font.semibold, fontSize: 15, color: ink.chipText },
  chipTextOn: { fontFamily: font.bold, color: ink.onEmerald },
});

export default EnergyRealityScreen;
