import React, { useMemo } from "react";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { ENERGY_OPTIONS, FEAR_OPTIONS } from "../../onboarding/options";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";
import type { LeanientFocusArea } from "@leanient/shared";

interface FearScreenProps {
  onBack?: () => void;
  onAnswer?: () => void;
}

// The chosen focus area becomes the "lens" for downstream copy (e.g. the verdict
// explainer). It is persisted to the draft's profile.biggestFear here.
export function FearScreen({ onBack, onAnswer }: FearScreenProps) {
  const { draft, setProfile } = useOnboarding();

  // The coach meets their side-effect answers by name before asking for the
  // fear: "Nausea, tired days. All normal, all plannable." Skip-path users
  // (no baseline recorded) get the plain reassurance.
  const context = useMemo(() => {
    const baseline = draft.profile.sideEffectBaseline ?? [];
    const named = ENERGY_OPTIONS.filter((o) => o.key !== null && baseline.includes(o.key)).map((o) =>
      o.label.toLowerCase(),
    );
    if (named.length === 0) return "All normal, all plannable.";
    const list = named.slice(0, 3).join(", ");
    return `${list.charAt(0).toUpperCase()}${list.slice(1)}. All normal, all plannable.`;
  }, [draft.profile.sideEffectBaseline]);

  const handleAnswer = (biggestFear: LeanientFocusArea) => {
    setProfile({ biggestFear });
    onAnswer?.();
  };

  return (
    <ConvoScreen<LeanientFocusArea>
      progress={onboardingProgress("fear")}
      onBack={onBack}
      context={context}
      question="What worries you most?"
      sub="Pick the one that keeps you up. Your plan guards it first."
      options={FEAR_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
      onAnswer={handleAnswer}
    />
  );
}

export default FearScreen;
