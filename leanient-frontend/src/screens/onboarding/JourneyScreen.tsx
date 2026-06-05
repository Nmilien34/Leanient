import React from "react";
import { SingleSelectScreen } from "./SingleSelectScreen";
import { JOURNEY_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
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
    <SingleSelectScreen<JourneyStage>
      progress={0.24}
      title="Where are you in your GLP-1 journey?"
      sub="We adjust your plan based on what's happening in your body right now."
      options={JOURNEY_OPTIONS}
      onBack={onBack}
      onAnswer={handleAnswer}
    />
  );
}

export default JourneyScreen;
