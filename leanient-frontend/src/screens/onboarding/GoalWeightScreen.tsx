import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ConvoButton, ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { Slider } from "../../components/ui/Slider";
import { useOnboarding } from "../../context/OnboardingContext";
import { goalWeightRange, DEFAULT_WEIGHT_LB } from "../../onboarding/units";
import { onboardingProgress } from "../../onboarding/flowProgress";
import { ink } from "../../theme/inkTokens";
import { font } from "../../theme/fonts";

interface GoalWeightScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function GoalWeightScreen({ onBack, onContinue }: GoalWeightScreenProps) {
  const { draft, setProfile } = useOnboarding();

  // Current weight comes from the previous screen (initialWeight). Fall back to a
  // default so the screen still renders if reached directly in dev.
  const currentWeight = draft.initialWeight?.value ?? DEFAULT_WEIGHT_LB;
  const unit = draft.initialWeight?.unit ?? "lb";
  const range = useMemo(() => goalWeightRange(currentWeight, unit), [currentWeight, unit]);

  const [goal, setGoal] = useState(range.initial);

  const diff = currentWeight - goal;
  const helper =
    diff > 0
      ? `${diff} ${unit} to go. Completely doable, the keeping-your-muscle way.`
      : "Your current weight";

  const handleContinue = () => {
    setProfile({ goalWeight: goal, goalWeightUnit: unit });
    onContinue?.();
  };

  return (
    <ConvoScreen
      progress={onboardingProgress("goalWeight")}
      onBack={onBack}
      context={`${currentWeight} ${unit} today. Thanks for trusting me with that.`}
      question="Where do you want to land?"
      sub="Set the weight you want to hold long-term. A number for life, never a crash target."
      footer={<ConvoButton label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.readout}>
        <Text style={styles.goalNum}>
          {goal} <Text style={styles.goalUnit}>{unit}</Text>
        </Text>
        <Text style={styles.helper}>{helper}</Text>
      </View>

      <View style={styles.sliderBlock}>
        <Slider min={range.min} max={range.max} value={goal} onChange={setGoal} />
        <View style={styles.marks}>
          <Text style={styles.mark}>
            {range.min} {unit}
          </Text>
          <Text style={styles.mark}>
            {range.max} {unit}
          </Text>
        </View>
      </View>
    </ConvoScreen>
  );
}

const styles = StyleSheet.create({
  readout: { marginTop: 30 },
  goalNum: { fontFamily: font.extrabold, fontSize: 56, letterSpacing: -1.96, color: ink.bright },
  goalUnit: { fontFamily: font.semibold, fontSize: 20, color: ink.soft },
  helper: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: ink.soft, marginTop: 8 },
  sliderBlock: { marginTop: 22 },
  marks: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  mark: { fontFamily: font.semibold, fontSize: 12, color: ink.faint },
});

export default GoalWeightScreen;
