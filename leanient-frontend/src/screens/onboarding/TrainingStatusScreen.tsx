import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { EQUIPMENT_OPTIONS, TRAINING_STATUS_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface TrainingStatusScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

/**
 * Frame 13 of the onboarding conversation: "Last one. Be honest." Three
 * training cards (not-yet framed as the perfect starting point) plus the
 * WHAT YOU'VE GOT AT HOME equipment chips that set the workout pool. Two
 * answers on one screen, so it keeps a footer CTA — "Build my plan".
 */
export function TrainingStatusScreen({ onBack, onAnswer }: TrainingStatusScreenProps) {
  const { draft, setProfile } = useOnboarding();

  const [statusIdx, setStatusIdx] = useState<number | null>(() => {
    const i = TRAINING_STATUS_OPTIONS.findIndex((o) => o.value === draft.profile.trainingStatus);
    return i >= 0 ? i : null;
  });
  const [equipIdx, setEquipIdx] = useState<number>(() => {
    const i = EQUIPMENT_OPTIONS.findIndex((o) => o.value === draft.profile.equipmentAccess);
    return i >= 0 ? i : 0; // "Nothing yet" pre-selected: the honest default
  });

  const tap = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = () => {
    if (statusIdx == null) return;
    setProfile({
      trainingStatus: TRAINING_STATUS_OPTIONS[statusIdx].value,
      equipmentAccess: EQUIPMENT_OPTIONS[equipIdx].value,
    });
    onAnswer?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("trainingStatus")}
      onBack={onBack}
      context="Last one. Be honest."
      question="How are you training right now?"
      footer={<ConvoButton label="Build my plan" disabled={statusIdx == null} onPress={handleContinue} />}
    >
      <View style={styles.cards}>
        {TRAINING_STATUS_OPTIONS.map((option, i) => {
          const on = i === statusIdx;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => {
                tap();
                setStatusIdx(i);
              }}
              style={[styles.card, on && styles.cardOn]}
            >
              <Text style={[styles.cardTitle, on && styles.cardTitleOn]}>{option.label}</Text>
              {option.sub ? <Text style={[styles.cardSub, on && styles.cardSubOn]}>{option.sub}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.groupLabel}>WHAT YOU'VE GOT AT HOME</Text>
      <View style={styles.chips}>
        {EQUIPMENT_OPTIONS.map((option, i) => {
          const on = i === equipIdx;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => {
                tap();
                setEquipIdx(i);
              }}
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
  cardTitle: { fontFamily: font.extrabold, fontSize: 16.5, letterSpacing: -0.25, color: ink.bright },
  cardTitleOn: { color: ink.emeraldHi },
  cardSub: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.soft },
  cardSubOn: { color: ink.bright },
  groupLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: ink.faint, marginTop: 24 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingTop: 12 },
  chip: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: ink.chipBorder },
  chipOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  chipText: { fontFamily: font.semibold, fontSize: 15, color: ink.chipText },
  chipTextOn: { fontFamily: font.bold, color: ink.onEmerald },
});

export default TrainingStatusScreen;
