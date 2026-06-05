import { describe, expect, it } from "vitest";
import { buildDoseLogDraft, siteHint, siteLabel, suggestNextSite } from "../../screens/app/doseLogForm";
import { mockMedicationProtocol } from "../../mocks/home";

describe("doseLogForm rotation", () => {
  it("suggests the next site in rotation from the last used", () => {
    expect(suggestNextSite("abdomen_left")).toBe("abdomen_right");
    expect(suggestNextSite("abdomen_right")).toBe("thigh_left");
    expect(suggestNextSite("arm_right")).toBe("abdomen_left"); // wraps
  });

  it("starts the rotation when there's no history", () => {
    expect(suggestNextSite(null)).toBe("abdomen_left");
  });

  it("labels sites in plain language", () => {
    expect(siteLabel("abdomen_right")).toBe("Right abdomen");
    expect(siteLabel("thigh_left")).toBe("Left thigh");
  });

  it("explains the rotation in the hint", () => {
    expect(siteHint("abdomen_right", "abdomen_right", "abdomen_left")).toBe(
      "Suggested next. You used Left abdomen last week, so rotate to avoid soreness.",
    );
    expect(siteHint("abdomen_left", "abdomen_right", "abdomen_left")).toBe(
      "You injected here last time. Rotating helps avoid soreness.",
    );
    expect(siteHint("thigh_left", "abdomen_right", "abdomen_left")).toBe("You used Left abdomen last week.");
  });
});

describe("buildDoseLogDraft", () => {
  it("maps the protocol + site to a DoseLog draft", () => {
    const draft = buildDoseLogDraft({ protocol: mockMedicationProtocol, site: "abdomen_right", recordedAt: "2026-06-03T09:14:00.000Z" });
    expect(draft).toEqual({
      medicationProtocolId: mockMedicationProtocol.id,
      doseAmount: 1,
      doseUnit: "mg",
      injectionSite: "abdomen_right",
      recordedAt: "2026-06-03T09:14:00.000Z",
    });
  });
});
