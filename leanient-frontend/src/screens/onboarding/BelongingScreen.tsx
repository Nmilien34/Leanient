import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { useOnboarding } from "../../context/OnboardingContext";
import { buildBelonging } from "../../onboarding/belonging";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface BelongingScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * Frame 06: the belonging beat. Every answer is met before the next ask —
 * their shot day is locked in, and the population stat (cited, never
 * invented) lands right before the "how are you feeling" question so the
 * symptoms they thought were theirs alone read as normal and plannable.
 */
export function BelongingScreen({ onBack, onContinue }: BelongingScreenProps) {
  const { draft } = useOnboarding();

  const view = useMemo(
    () =>
      buildBelonging({
        shotDays: draft.medicationProtocol.shotDays,
        medicationName: draft.medicationProtocol.medicationName,
      }),
    [draft.medicationProtocol.shotDays, draft.medicationProtocol.medicationName],
  );

  return (
    <ConvoScreen
      progress={onboardingProgress("belonging")}
      onBack={onBack}
      context={view.context}
      question="You're in good company."
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Good to know"
          onPress={onContinue}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Good to know</Text>
        </Pressable>
      }
    >
      <View style={styles.stat}>
        <Text style={styles.statNum}>
          {view.statNum.replace(/\+$/, "")}
          <Text style={{ color: ink.emeraldHi }}>+</Text>
        </Text>
        <Text style={styles.statLine}>{view.statLine}</Text>
        <Text style={styles.statCite}>{view.statCite}</Text>
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  stat: { paddingTop: 48 },
  statNum: { fontFamily: font.extrabold, fontSize: 56, letterSpacing: -1.96, color: ink.bright },
  statLine: { fontFamily: font.semibold, fontSize: 16.5, lineHeight: 23, color: ink.chipText, marginTop: 10, maxWidth: 320 },
  statCite: { fontFamily: font.medium, fontSize: 12, color: ink.dim, marginTop: 10 },
  cta: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: "rgba(238,244,234,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { backgroundColor: ink.bubbleGround },
  ctaText: { fontFamily: font.bold, fontSize: 16.5, letterSpacing: -0.17, color: ink.bright },
});

export default BelongingScreen;
