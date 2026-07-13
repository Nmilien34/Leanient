import React from "react";
import { StyleSheet, Text } from "react-native";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface TruthScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

/**
 * The stakes and the fix in one breath. The stat responds to the fear they
 * just named, lands with its citation, and reassurance arrives on the same
 * screen. Numbers per docs/glp1-clinical-reference.md (STEP-1 DEXA substudy,
 * ~39% lean share; "lean mass" wording is deliberate, DEXA overstates true
 * muscle loss).
 */
export function TruthScreen({ onBack, onContinue }: TruthScreenProps) {
  const { draft } = useOnboarding();

  // Meet the fear they picked; muscle worriers get told their instinct is right.
  const fear = draft.profile.biggestFear;
  const context =
    fear === "losing_muscle"
      ? "You said losing muscle. Good instinct."
      : "One thing matters more than the scale.";

  return (
    <ConvoScreen
      progress={onboardingProgress("truth")}
      onBack={onBack}
      context={context}
      question="Up to 39% of the weight lost on a GLP-1 can be lean mass."
      sub="STEP-1 trial, DEXA substudy · New England Journal of Medicine"
      footer={<ConvoButton label="Build my plan" onPress={onContinue} />}
    >
      <Text style={styles.fix}>
        And it's preventable. Protein, resistance, rhythm.{" "}
        <Text style={styles.fixEm}>People who plan for it keep what's theirs.</Text> That plan is
        what we build next.
      </Text>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  fix: {
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: 26,
    color: "rgba(238,244,234,0.85)",
    marginTop: 40,
    maxWidth: 320,
  },
  fixEm: { fontFamily: font.bold, color: ink.emeraldHi },
});

export default TruthScreen;
