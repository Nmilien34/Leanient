import { describe, expect, it } from "vitest";
import { defaultReminderState, deriveReminderGroups } from "../../screens/app/reminderSettings";
import { mockMedicationProtocol } from "../../mocks/home";

describe("deriveReminderGroups", () => {
  it("names the shot-day reminder after the user's actual shot day", () => {
    const groups = deriveReminderGroups({ medication: { ...mockMedicationProtocol, shotDays: ["saturday"] } });
    const shotDay = groups.flatMap((g) => g.items).find((i) => i.id === "shot_day");
    expect(shotDay?.subtitle).toBe("Saturday at 9:00 AM");
    expect(shotDay?.schedule).toEqual({ kind: "weekly", weekdays: [7], hour: 9, minute: 0 });
  });

  it("falls back to a generic shot-day label off-protocol", () => {
    const groups = deriveReminderGroups({ medication: undefined });
    const shotDay = groups.flatMap((g) => g.items).find((i) => i.id === "shot_day");
    expect(shotDay?.subtitle).toBe("shot day at 9:00 AM");
  });

  it("groups the reminders into cycle / daily / quiet hours", () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    expect(groups.map((g) => g.title)).toEqual(["REMINDERS · FOLLOW YOUR CYCLE", "DAILY", "QUIET HOURS"]);
  });

  it("guard-day evenings land on shot day +5 and +6", () => {
    const groups = deriveReminderGroups({ medication: { ...mockMedicationProtocol, shotDays: ["saturday"] } });
    const guard = groups.flatMap((g) => g.items).find((i) => i.id === "guard_evening");
    // Saturday shot (expo 7) → Thursday (5) and Friday (6) evenings
    expect(guard?.schedule).toEqual({ kind: "weekly", weekdays: [5, 6], hour: 17, minute: 30 });
  });

  it("session and weigh-in follow the strongest window (day 2-3)", () => {
    const groups = deriveReminderGroups({ medication: { ...mockMedicationProtocol, shotDays: ["saturday"] } });
    const workout = groups.flatMap((g) => g.items).find((i) => i.id === "workout");
    const weighIn = groups.flatMap((g) => g.items).find((i) => i.id === "weigh_in");
    // Saturday shot → Monday (2) and Tuesday (3)
    expect(workout?.schedule).toEqual({ kind: "weekly", weekdays: [2, 3], hour: 17, minute: 0 });
    expect(weighIn?.schedule).toEqual({ kind: "weekly", weekdays: [2], hour: 8, minute: 0 });
  });

  it("seeds default on/off state (photo day off, the rest on)", () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    const state = defaultReminderState(groups);
    expect(state.photo_day).toBe(false);
    expect(state.weekly === undefined).toBe(true); // no such id
    expect(state.verdict).toBe(true);
    expect(state.quiet_hours).toBe(true);
  });

  it("marks quiet hours as a preference, not a scheduled notification", () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    const quietHours = groups.flatMap((g) => g.items).find((i) => i.id === "quiet_hours");
    expect(quietHours?.schedule).toEqual({ kind: "none" });
  });
});
