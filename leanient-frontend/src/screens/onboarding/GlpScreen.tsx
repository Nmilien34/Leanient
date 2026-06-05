import React, { useMemo } from "react";
import { SingleSelectScreen } from "./SingleSelectScreen";
import { buildGlpOptions, type GlpSelection } from "../../onboarding/options";
import { mockMedicationCatalog } from "../../mocks/medications";
import { useOnboarding } from "../../context/OnboardingContext";

interface GlpScreenProps {
  onBack?: () => void;
  /** `hasMedication` is true when the user picked a real medication (vs considering / not on a GLP-1). */
  onAnswer?: (hasMedication: boolean) => void;
}

export function GlpScreen({ onBack, onAnswer }: GlpScreenProps) {
  const { setMedication, setNotOnGlp } = useOnboarding();
  // Sourced from the (shared-typed) catalog; swap mock for GET /medications at integration.
  const options = useMemo(() => buildGlpOptions(mockMedicationCatalog), []);

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
    <SingleSelectScreen<GlpSelection>
      progress={0.12}
      title="Are you on a GLP-1 medication?"
      sub="Leanient is built specifically for people on these. If you're not, we may not be the right fit."
      options={options}
      onBack={onBack}
      onAnswer={handleAnswer}
    />
  );
}

export default GlpScreen;
