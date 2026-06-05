import React from "react";
import { SingleSelectScreen } from "./SingleSelectScreen";
import { TRAINING_STATUS_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import type { TrainingStatus } from "@leanient/shared";

interface TrainingStatusScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

/**
 * Training Status (onboarding). Captures the required `profile.trainingStatus`,
 * which feeds the backend Mifflin-St Jeor calorie model plus the inferred weekly
 * workout target / equipment access. Single-select with title + subtext cards.
 */
export function TrainingStatusScreen({ onBack, onAnswer }: TrainingStatusScreenProps) {
  const { setProfile } = useOnboarding();

  const handleAnswer = (trainingStatus: TrainingStatus) => {
    setProfile({ trainingStatus });
    onAnswer?.();
  };

  return (
    <SingleSelectScreen<TrainingStatus>
      progress={0.66}
      title="How are you training right now?"
      sub="This helps us calibrate your daily calorie target. You can adjust later."
      options={TRAINING_STATUS_OPTIONS}
      onBack={onBack}
      onAnswer={handleAnswer}
    />
  );
}

export default TrainingStatusScreen;
