import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { Weekday } from "@leanient/shared";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { useOnboarding } from "../../context/OnboardingContext";
import { SHOT_DAY_OPTIONS, shotDayCoachNote, sortShotDays } from "../../onboarding/shotDay";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface ShotDayScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * Shot day, the anchor question. Captures the contract's required `shotDays`
 * as a non-empty `Weekday[]`; most users pick one day, split-dose protocols
 * pick several (so it keeps a Continue footer). The coach note stays dynamic
 * on the selected medication + days.
 */
export function ShotDayScreen({ onBack, onContinue }: ShotDayScreenProps) {
  const { draft, setMedication } = useOnboarding();
  const [days, setDays] = useState<Weekday[]>(draft.medicationProtocol.shotDays ?? []);

  const toggleDay = (key: Weekday) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDays((current) =>
      current.includes(key) ? current.filter((d) => d !== key) : sortShotDays([...current, key]),
    );
  };

  const coach = shotDayCoachNote(draft.medicationProtocol.medicationName, days);
  const dose = draft.medicationProtocol.doseAmount;
  const context = dose != null ? `${dose} ${draft.medicationProtocol.doseUnit ?? "mg"}, noted.` : "Noted.";

  const handleContinue = () => {
    if (days.length === 0) return;
    setMedication({ shotDays: sortShotDays(days) });
    onContinue?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("shotDay")}
      onBack={onBack}
      context={context}
      question="What days do you take your shot?"
      sub="This one matters most. Your whole plan beats to it. Most people pick one; choose more if you split your dose."
      footer={<ConvoButton label="Continue" disabled={days.length === 0} onPress={handleContinue} />}
    >
      <View style={styles.chipRow}>
        {SHOT_DAY_OPTIONS.map((o) => {
          const on = days.includes(o.key);
          return (
            <Pressable
              key={o.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.long}
              onPress={() => toggleDay(o.key)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.short}</Text>
            </Pressable>
          );
        })}
      </View>

      {coach ? (
        <View style={styles.coach}>
          <Text style={styles.coachText}>{coach}</Text>
        </View>
      ) : null}
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", gap: 7, paddingTop: 26 },
  chip: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: ink.chipBorder,
  },
  chipOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  chipText: { fontFamily: font.bold, fontSize: 12.5, color: ink.chipText },
  chipTextOn: { color: ink.onEmerald },
  coach: {
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "rgba(47,184,122,0.12)",
    borderWidth: 1,
    borderColor: "rgba(111,224,166,0.30)",
  },
  coachText: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: ink.bright },
});

export default ShotDayScreen;
