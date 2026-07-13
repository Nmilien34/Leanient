import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { AgeWheel } from "../../components/ui/AgeWheel";
import { ink } from "../../theme/inkTokens";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import type { SexAssignedAtBirth } from "../../onboarding/draft";

interface BasicsScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

// Sex + age feed the backend calorie model (Mifflin-St Jeor). Sex is male/female
// only: a biological input, separate from gender identity. They are written to the
// draft's `basics` slice and submitted with onboarding.
const SEX_OPTIONS: { key: SexAssignedAtBirth; label: string }[] = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
];

export function BasicsScreen({ onBack, onContinue }: BasicsScreenProps) {
  const { setBasics } = useOnboarding();
  const [sex, setSex] = useState<SexAssignedAtBirth | null>(null);
  const [age, setAge] = useState(30);

  const pickSex = (key: SexAssignedAtBirth) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSex(key);
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("basics")}
      onBack={onBack}
      context="Now we calibrate."
      question="A couple basics."
      sub="These set your protein and calorie targets. Nothing else."
      footer={
        <ConvoButton
          label="Continue"
          disabled={sex === null}
          onPress={() => {
            if (!sex) return;
            setBasics({ sexAssignedAtBirth: sex, age });
            onContinue?.();
          }}
        />
      }
    >
      <Text style={[styles.eyebrow, { marginTop: 26 }]}>SEX ASSIGNED AT BIRTH</Text>
      <View style={styles.segRow}>
        {SEX_OPTIONS.map((o) => {
          const on = sex === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => pickSex(o.key)}
              style={[styles.seg, on && styles.segOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.sexCaption}>
        We use this to calculate your calorie target accurately. This is a biological input
        separate from gender identity.
      </Text>

      <Text style={[styles.eyebrow, { marginTop: 28, marginBottom: 12 }]}>AGE</Text>
      <View style={styles.panel}>
        <AgeWheel value={age} onChange={setAge} />
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.99, color: ink.faint, marginBottom: 12 },
  segRow: { flexDirection: "row", gap: 10 },
  seg: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: ink.chipBorder,
  },
  segOn: { backgroundColor: ink.emerald, borderColor: ink.emerald },
  segText: { fontFamily: font.semibold, fontSize: 15, color: ink.chipText },
  segTextOn: { fontFamily: font.bold, color: ink.onEmerald },
  sexCaption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink.soft, marginTop: 10 },
  panel: { borderRadius: 20, backgroundColor: colors.paper, paddingVertical: 8, paddingHorizontal: 10 },
});

export default BasicsScreen;
