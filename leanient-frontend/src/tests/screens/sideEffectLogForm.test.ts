import { describe, expect, it } from "vitest";
import { buildSideEffectLogDraft, initialSideEffectForm, sideEffectCoachLine } from "../../screens/app/sideEffectLogForm";

describe("sideEffectCoachLine", () => {
  it("frames nausea around the shot when recently dosed", () => {
    expect(sideEffectCoachLine("nausea", 2)).toBe(
      "Nausea is common a day or two after your shot and usually eases. Smaller, protein-first meals help. I'll flag it if it keeps up so you can call your prescriber.",
    );
  });

  it("softens the shot framing later in the cycle", () => {
    expect(sideEffectCoachLine("nausea", 5)).toContain("on GLP-1s");
  });

  it("gives symptom-specific guidance and a safety tail", () => {
    expect(sideEffectCoachLine("headache", 1)).toContain("behind on water");
    expect(sideEffectCoachLine("headache", 1)).toContain("call your prescriber");
  });

  it("omits the prescriber tail for 'other'", () => {
    expect(sideEffectCoachLine("other", 1)).not.toContain("call your prescriber");
  });
});

describe("buildSideEffectLogDraft", () => {
  it("maps the form to a SideEffectLog draft, flagging dose-related when recent", () => {
    const draft = buildSideEffectLogDraft(initialSideEffectForm, 2, "2026-06-03T08:00:00.000Z");
    expect(draft).toEqual({
      symptom: "nausea",
      severity: 2,
      customSymptom: undefined,
      relatedToDose: true,
      notes: undefined,
      recordedAt: "2026-06-03T08:00:00.000Z",
    });
  });

  it("captures a custom symptom + note for 'other', and is not dose-related late in the cycle", () => {
    const draft = buildSideEffectLogDraft({ symptom: "other", severity: 1, note: "metallic taste" }, 6, "2026-06-03T08:00:00.000Z");
    expect(draft.customSymptom).toBe("metallic taste");
    expect(draft.notes).toBe("metallic taste");
    expect(draft.relatedToDose).toBe(false);
  });
});
