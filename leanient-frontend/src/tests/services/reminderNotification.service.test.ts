import { beforeEach, describe, expect, it, vi } from "vitest";
import { testStorage } from "../testStorage";
import { deriveReminderGroups } from "../../screens/app/reminderSettings";
import { mockMedicationProtocol } from "../../mocks/home";
import {
  buildReminderNotificationRequests,
  loadReminderState,
  REMINDER_STORAGE_KEY,
  saveReminderState,
  syncReminderNotifications,
  type ReminderNotificationAdapter,
} from "../../services/reminderNotification.service";

vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
    TIME_INTERVAL: "timeInterval",
    WEEKLY: "weekly",
  },
  getAllScheduledNotificationsAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}));

function adapter(args?: { granted?: boolean; existingIds?: string[] }) {
  const scheduled: unknown[] = [];
  const canceled: string[] = [];
  const existing = args?.existingIds ?? ["leanient.reminder.verdict", "other.local.notification"];
  const granted = args?.granted ?? true;

  const fake: ReminderNotificationAdapter = {
    async getAllScheduledNotificationsAsync() {
      return existing.map((identifier) => ({ identifier }));
    },
    async getPermissionsAsync() {
      return { status: granted ? "granted" : "denied", granted, canAskAgain: !granted };
    },
    async requestPermissionsAsync() {
      return { status: granted ? "granted" : "denied", granted, canAskAgain: !granted };
    },
    async scheduleNotificationAsync(request) {
      scheduled.push(request);
      return request.identifier;
    },
    async cancelScheduledNotificationAsync(identifier) {
      canceled.push(identifier);
    },
  };

  return { fake, scheduled, canceled };
}

beforeEach(() => {
  testStorage.clear();
});

describe("reminder notification scheduling", () => {
  it("builds scheduled requests from enabled reminder rows and skips quiet hours", () => {
    const groups = deriveReminderGroups({ medication: { ...mockMedicationProtocol, shotDays: ["monday", "saturday"] } });
    const requests = buildReminderNotificationRequests(groups, {
      verdict: true,
      protein: false,
      shot_day: true,
      workout: false,
      weigh_in: true,
      photo_day: true,
      quiet_hours: true,
    });

    expect(requests.map((request) => request.identifier)).toEqual([
      "leanient.reminder.shot_day.2",
      "leanient.reminder.shot_day.7",
      "leanient.reminder.verdict.1",
      "leanient.reminder.photo_day.2",
      "leanient.reminder.photo_day.7",
      "leanient.reminder.weigh_in.4",
      "leanient.reminder.weigh_in.2",
    ]);
    expect(requests[0]?.trigger).toEqual({ kind: "weekly", weekday: 2, hour: 9, minute: 0 });
    expect(requests.some((request) => request.identifier.includes("quiet_hours"))).toBe(false);
  });

  it("persists reminder state merged with current defaults", async () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    await saveReminderState({ verdict: false, progress_photo: true });

    const raw = await testStorage.getItem(REMINDER_STORAGE_KEY);
    expect(JSON.parse(raw ?? "{}")).toEqual({ verdict: false, progress_photo: true });

    const loaded = await loadReminderState(groups);
    expect(loaded.verdict).toBe(false);
    expect(loaded.progress_photo).toBe(true);
    expect(loaded.shot_day).toBe(true);
  });

  it("requests permission, cancels old Leanient reminders, and schedules enabled reminders", async () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    const { fake, scheduled, canceled } = adapter();

    const result = await syncReminderNotifications(groups, { verdict: true, shot_day: true }, fake);

    expect(result.permissionStatus).toBe("granted");
    expect(canceled).toEqual(["leanient.reminder.verdict"]);
    expect(scheduled).toHaveLength(2);
    expect(scheduled.map((request) => (request as { identifier: string }).identifier)).toEqual([
      "leanient.reminder.shot_day.7",
      "leanient.reminder.verdict.1",
    ]);
  });

  it("cancels existing reminders and schedules none when permission is denied", async () => {
    const groups = deriveReminderGroups({ medication: mockMedicationProtocol });
    const { fake, scheduled, canceled } = adapter({ granted: false, existingIds: ["leanient.reminder.shot_day.7"] });

    const result = await syncReminderNotifications(groups, { shot_day: true }, fake);

    expect(result.permissionStatus).toBe("denied");
    expect(canceled).toEqual(["leanient.reminder.shot_day.7"]);
    expect(scheduled).toHaveLength(0);
  });
});
