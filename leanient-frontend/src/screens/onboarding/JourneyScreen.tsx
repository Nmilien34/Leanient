import React from "react";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { JOURNEY_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import type { JourneyStage } from "@leanient/shared";

interface JourneyScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

export function JourneyScreen({ onBack, onAnswer }: JourneyScreenProps) {
  const { setProfile } = useOnboarding();

  const handleAnswer = (journeyStage: JourneyStage) => {
    setProfile({ journeyStage });
    onAnswer?.();
  };

  return (
    <ConvoScreen<JourneyStage>
      progress={onboardingProgress("journey")}
      onBack={onBack}
      context="Good. Let's get to know each other."
      question="Where are you in your GLP-1 journey?"
      options={JOURNEY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
      onAnswer={handleAnswer}
    />
  );
}

export default JourneyScreen;
