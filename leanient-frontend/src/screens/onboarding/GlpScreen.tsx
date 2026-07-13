import React, { useEffect, useMemo } from "react";
import { ConvoScreen } from "../../components/onboarding/ConvoScreen";
import { buildGlpOptions, type GlpSelection } from "../../onboarding/options";
import { mockMedicationCatalog } from "../../mocks/medications";
import { useLeanientData } from "../../context/LeanientDataContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { onboardingProgress } from "../../onboarding/flowProgress";

interface GlpScreenProps {
  onBack?: () => void;
  /** `hasMedication` is true when the user picked a real medication (vs considering / not on a GLP-1). */
  onAnswer?: (hasMedication: boolean) => void;
}

export function GlpScreen({ onBack, onAnswer }: GlpScreenProps) {
  const { setMedication, setNotOnGlp } = useOnboarding();
  const { medicationCatalog, refreshMedicationCatalog } = useLeanientData();

  useEffect(() => {
    if (!medicationCatalog.length) {
      void refreshMedicationCatalog();
    }
  }, [medicationCatalog.length, refreshMedicationCatalog]);

  const catalog = medicationCatalog.length ? medicationCatalog : mockMedicationCatalog;
  const options = useMemo(() => buildGlpOptions(catalog), [catalog]);

  const handleAnswer = (sel: GlpSelection) => {
    if (sel.kind === "medication") {
      setNotOnGlp(false);
      setMedication({
        medicationCatalogId: sel.medicationCatalogId,
        medicationName: sel.medicationName,
      });
    } else {
      // "considering" or "not on a GLP-1": no medicationName; the protocol step is skipped.
      setNotOnGlp(true);
    }
    onAnswer?.(sel.kind === "medication");
  };

  return (
    <ConvoScreen<GlpSelection>
      progress={onboardingProgress("glp")}
      onBack={onBack}
      context="Got it."
      question="What are you taking?"
      sub="No judgment here. This tunes everything to your med's rhythm."
      options={options.map((o) => ({ label: o.label, value: o.value }))}
      onAnswer={handleAnswer}
    />
  );
}

export default GlpScreen;
