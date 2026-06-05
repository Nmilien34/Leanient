import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import apiService from "../services/api.service";
import { emptyDraft, type FrontendOnlyBasics, type OnboardingDraft } from "../onboarding/draft";
import { toOnboardingCompleteRequest } from "../onboarding/submit";

// Derive the result from the typed API method so schema-level response changes
// break compilation at the call sites that consume onboarding completion.
export type CompleteOnboardingResult = Awaited<ReturnType<typeof apiService.completeOnboarding>>;

type ProfilePatch = Partial<OnboardingDraft["profile"]>;
type MedicationPatch = Partial<OnboardingDraft["medicationProtocol"]>;
type WeightPatch = Partial<NonNullable<OnboardingDraft["initialWeight"]>>;

export interface OnboardingContextValue {
  draft: OnboardingDraft;
  setProfile(patch: ProfilePatch): void;
  setMedication(patch: MedicationPatch): void;
  setInitialWeight(patch: WeightPatch): void;
  setBasics(patch: Partial<FrontendOnlyBasics>): void;
  setNotOnGlp(value: boolean): void;
  reset(): void;
  /** Assemble the draft into the shared request and POST /onboarding/complete. */
  submit(): Promise<CompleteOnboardingResult>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);

  const setProfile = useCallback((patch: ProfilePatch) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }, []);

  const setMedication = useCallback((patch: MedicationPatch) => {
    setDraft((d) => ({ ...d, medicationProtocol: { ...d.medicationProtocol, ...patch } }));
  }, []);

  const setInitialWeight = useCallback((patch: WeightPatch) => {
    setDraft((d) => ({ ...d, initialWeight: { ...d.initialWeight, ...patch } }));
  }, []);

  const setBasics = useCallback((patch: Partial<FrontendOnlyBasics>) => {
    setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));
  }, []);

  const setNotOnGlp = useCallback((value: boolean) => {
    setDraft((d) => ({ ...d, notOnGlp: value }));
  }, []);

  const reset = useCallback(() => setDraft(emptyDraft), []);

  const submit = useCallback(async () => {
    return apiService.completeOnboarding(toOnboardingCompleteRequest(draft));
  }, [draft]);

  const value = useMemo<OnboardingContextValue>(
    () => ({ draft, setProfile, setMedication, setInitialWeight, setBasics, setNotOnGlp, reset, submit }),
    [draft, setProfile, setMedication, setInitialWeight, setBasics, setNotOnGlp, reset, submit],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
