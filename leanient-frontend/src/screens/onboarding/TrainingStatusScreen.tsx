import React from "react";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { TRAINING_STATUS_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import type { TrainingStatus } from "@leanient/shared";

interface TrainingStatusScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

/**
 * Training status. Captures the required `profile.trainingStatus`, which feeds
 * the backend Mifflin-St Jeor calorie model plus the inferred weekly workout
 * target / equipment access. Options keep their sub-lines so "not yet" reads
 * as the perfect starting point, never a confession.
 */
export function TrainingStatusScreen({ onBack, onAnswer }: TrainingStatusScreenProps) {
  const { setProfile } = useOnboarding();

  const handleAnswer = (trainingStatus: TrainingStatus) => {
    setProfile({ trainingStatus });
    onAnswer?.();
  };

  return (
    <ConvoScreen<TrainingStatus>
      progress={onboardingProgress("trainingStatus")}
      onBack={onBack}
      context="Last one. Be honest."
      question="How are you training right now?"
      options={TRAINING_STATUS_OPTIONS.map((o) => ({ label: o.label, sub: o.sub, value: o.value }))}
      onAnswer={handleAnswer}
    />
  );
}

export default TrainingStatusScreen;
