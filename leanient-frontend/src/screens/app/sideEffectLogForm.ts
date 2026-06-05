import type { SideEffectSymptom } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Side effect screen (40). The coach line is
 * symptom-specific and shot-aware (GLP-1 side effects often peak a day or two
 * after the dose). `buildSideEffectLogDraft` maps to the shared `SideEffectLog`.
 */

export interface SymptomOption {
  id: SideEffectSymptom;
  label: string;
}

// Prototype order; maps each chip to a contract symptom.
export const SYMPTOMS: SymptomOption[] = [
  { id: "nausea", label: "Nausea" },
  { id: "fatigue", label: "Fatigue" },
  { id: "gi", label: "Constipation" },
  { id: "reflux", label: "Heartburn" },
  { id: "headache", label: "Headache" },
  { id: "appetite_loss", label: "Low appetite" },
  { id: "dizziness", label: "Dizziness" },
  { id: "other", label: "Other" },
];

export interface SeverityOption {
  level: number;
  label: string;
}

export const SEVERITIES: SeverityOption[] = [
  { level: 1, label: "Mild" },
  { level: 2, label: "Moderate" },
  { level: 3, label: "Severe" },
];

/** Symptom-specific guidance; shot-related ones soften when recently dosed. */
export function sideEffectCoachLine(symptom: SideEffectSymptom, daysSinceShot: number | null): string {
  const recentShot = daysSinceShot != null && daysSinceShot <= 3;
  const guidance: Record<SideEffectSymptom, string> = {
    nausea: `Nausea is common ${recentShot ? "a day or two after your shot" : "on GLP-1s"} and usually eases. Smaller, protein-first meals help.`,
    fatigue: `Low energy ${recentShot ? "is normal just after your shot" : "can track your shot cycle"}. Hydrate, keep protein up, and ease off intensity today.`,
    gi: "Constipation is common on GLP-1s. Water, fiber, and a short walk usually get things moving.",
    reflux: "Reflux eases with smaller meals and staying upright after you eat.",
    headache: "Headaches often mean you're behind on water. Hydrate and check you're eating enough.",
    appetite_loss: "Low appetite is the medicine working. Still aim for protein first so you keep your muscle.",
    dizziness: "Dizziness can come from low food or fluids. Sip water and eat something small.",
    other: "Noted. I'll watch for a pattern across your shot cycle.",
  };
  const tail = symptom === "other" ? "" : " I'll flag it if it keeps up so you can call your prescriber.";
  return guidance[symptom] + tail;
}

export interface SideEffectForm {
  symptom: SideEffectSymptom;
  severity: number;
  note: string;
}

export const initialSideEffectForm: SideEffectForm = {
  symptom: "nausea",
  severity: 2, // Moderate
  note: "",
};

export interface SideEffectLogDraft {
  symptom: SideEffectSymptom;
  severity: number;
  customSymptom?: string;
  relatedToDose: boolean;
  notes?: string;
  recordedAt: string;
}

export function buildSideEffectLogDraft(form: SideEffectForm, daysSinceShot: number | null, recordedAt: string): SideEffectLogDraft {
  const note = form.note.trim();
  return {
    symptom: form.symptom,
    severity: form.severity,
    customSymptom: form.symptom === "other" && note ? note : undefined,
    relatedToDose: daysSinceShot != null && daysSinceShot <= 3,
    notes: note || undefined,
    recordedAt,
  };
}
