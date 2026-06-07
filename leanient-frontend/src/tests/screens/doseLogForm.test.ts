import { describe, expect, it } from "vitest";
import {
  buildDoseCalendarMonth,
  buildDoseLogDraft,
  formatDoseLogWhen,
  siteHint,
  siteLabel,
  suggestNextSite,
  withDoseLogDate,
} from "../../screens/app/doseLogForm";
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

  it("rejects protocols without a positive dose amount before API submission", () => {
    expect(() =>
      buildDoseLogDraft({
        protocol: { ...mockMedicationProtocol, doseAmount: undefined },
        site: "abdomen_right",
        recordedAt: "2026-06-03T09:14:00.000Z",
      }),
    ).toThrow("Set your dose amount in Medication settings before logging a dose.");
  });
});

describe("dose log date helpers", () => {
  it("formats today with time and other days with month/day", () => {
    const now = new Date(2026, 5, 6, 16, 4);

    expect(formatDoseLogWhen(new Date(2026, 5, 6, 16, 4), now)).toBe("Today · 4:04 PM");
    expect(formatDoseLogWhen(new Date(2026, 5, 8, 16, 4), now)).toBe("Jun 8 · 4:04 PM");
  });

  it("changes the calendar date while preserving the selected time", () => {
    const selected = withDoseLogDate(new Date(2026, 5, 6, 16, 4), 2026, 5, 12);

    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(5);
    expect(selected.getDate()).toBe(12);
    expect(selected.getHours()).toBe(16);
    expect(selected.getMinutes()).toBe(4);
  });

  it("builds a selectable month grid with selected and today states", () => {
    const cells = buildDoseCalendarMonth(
      new Date(2026, 5, 1),
      new Date(2026, 5, 12, 16, 4),
      new Date(2026, 5, 6, 16, 4),
    );

    expect(cells).toHaveLength(35);
    expect(cells.find((cell) => cell.day === 12)).toMatchObject({ isSelected: true, isToday: false });
    expect(cells.find((cell) => cell.day === 6)).toMatchObject({ isSelected: false, isToday: true });
  });
});
