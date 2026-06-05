import { describe, expect, it } from "vitest";
import { defaultReminderState, deriveReminderGroups } from "../../screens/app/reminderSettings";
import { mockMedicationProtocol } from "../../mocks/home";

describe("deriveReminderGroups", () => {
  it("names the shot-day reminder after the user's actual shot day", () => {
    const groups = deriveReminderGroups({ medication: { ...mockMedicationProtocol, shotDay: "saturday" } });
    const shotDay = groups.flatMap((g) => g.items).find((i) => i.id === "shot_day");
    expect(shotDay?.subtitle).toBe("Saturday morning");
  });

  it("falls back to a generic shot-day label off-protocol", () => {
    const groups = deriveReminderGroups({ medication: undefined });
    const shotDay = groups.flatMap((g) => g.items).find((i) => i.id === "shot_day");
    expect(shotDay?.subtitle).toBe("shot day morning");
  });

  it("groups the reminders into coaching / check-ins / quiet hours", () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    expect(groups.map((g) => g.title)).toEqual(["COACHING", "CHECK-INS", "QUIET HOURS"]);
  });

  it("seeds default on/off state (progress photo off, the rest on)", () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    const state = defaultReminderState(groups);
    expect(state.progress_photo).toBe(false);
    expect(state.weekly === undefined).toBe(true); // no such id
    expect(state.verdict).toBe(true);
    expect(state.quiet_hours).toBe(true);
  });
});
