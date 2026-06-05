import React from "react";
import { SingleSelectScreen } from "./SingleSelectScreen";
import { FEAR_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import type { LeanientFocusArea } from "@leanient/shared";

interface FearScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

// The chosen focus area becomes the "lens" for downstream copy (e.g. the verdict
// explainer). It is persisted to the draft's profile.biggestFear here.
export function FearScreen({ onBack, onAnswer }: FearScreenProps) {
  const { setProfile } = useOnboarding();

  const handleAnswer = (biggestFear: LeanientFocusArea) => {
    setProfile({ biggestFear });
    onAnswer?.();
  };

  return (
    <SingleSelectScreen<LeanientFocusArea>
      progress={0.36}
      title="What are you most worried about?"
      sub="Pick the one that keeps you up. We'll prioritize it."
      options={FEAR_OPTIONS}
      onBack={onBack}
      onAnswer={handleAnswer}
    />
  );
}

export default FearScreen;
