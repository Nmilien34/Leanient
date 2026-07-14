import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { ReminderGroup, ReminderScheduleRule } from "../screens/app/reminderSettings";

export const REMINDER_STORAGE_KEY = "leanient.reminders.state";
const REMINDER_IDENTIFIER_PREFIX = "leanient.reminder.";
const REMINDER_CHANNEL_ID = "leanient-reminders";

export type ReminderPermissionStatus = "granted" | "denied" | "undetermined";

export type ReminderNotificationTrigger =
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "timeInterval"; seconds: number; repeats: true }
  | { kind: "weekly"; weekday: number; hour: number; minute: number };

export interface ReminderNotificationRequest {
  identifier: string;
  reminderId: string;
  title: string;
  body: string;
  trigger: ReminderNotificationTrigger;
}

export interface ReminderNotificationAdapter {
  prepareAsync?: () => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<Array<{ identifier: string }>>;
  getPermissionsAsync: () => Promise<{ status: string; granted: boolean; canAskAgain?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string; granted: boolean; canAskAgain?: boolean }>;
  scheduleNotificationAsync: (request: {
    identifier: string;
    content: { title: string; body: string; data: Record<string, string> };
    trigger: ReminderNotificationTrigger;
  }) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
}

const reminderCopy: Record<string, { title: string; body: string }> = {
  guard_evening: {
    title: "Tonight gets loud",
    body: "The hunger window opens this evening. Protein first, then the walk.",
  },
  photo_day: {
    title: "Photo day",
    body: "Same mirror, same light. Twenty seconds your future self will thank you for.",
  },
  verdict: {
    title: "Your Leanient verdict is ready",
    body: "Open Leanient for this week's muscle-retention read.",
  },
  protein: {
    title: "Protein check",
    body: "If the morning ran light, anchor lunch with protein.",
  },
  shot_day: {
    title: "Shot day",
    body: "Land the shot, keep the day gentle. Your easiest window opens tomorrow.",
  },
  workout: {
    title: "Your strongest window",
    body: "Day 2 energy is yours. A short session banks it.",
  },
  weigh_in: {
    title: "Morning weigh-in",
    body: "Day 2 reads truest. Thirty seconds on the scale.",
  },
  progress_photo: {
    title: "Photo day",
    body: "Same mirror, same light. Twenty seconds your future self will thank you for.",
  },
};

let notificationHandlerConfigured = false;

const expoReminderNotificationAdapter: ReminderNotificationAdapter = {
  async prepareAsync() {
    if (!notificationHandlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationHandlerConfigured = true;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: "Leanient reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  },
  getAllScheduledNotificationsAsync: Notifications.getAllScheduledNotificationsAsync,
  getPermissionsAsync: Notifications.getPermissionsAsync,
  requestPermissionsAsync: () =>
    Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    }),
  scheduleNotificationAsync: (request) =>
    Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: request.content,
      trigger: toExpoTrigger(request.trigger),
    }),
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync,
};

function defaultStateForGroups(groups: ReminderGroup[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const group of groups) {
    for (const item of group.items) {
      state[item.id] = item.defaultOn;
    }
  }
  return state;
}

function normalizePermissionStatus(status: string, granted: boolean): ReminderPermissionStatus {
  if (granted || status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function notificationId(reminderId: string, suffix?: string | number): string {
  return `${REMINDER_IDENTIFIER_PREFIX}${reminderId}${suffix === undefined ? "" : `.${suffix}`}`;
}

function buildTriggerRequests(
  reminderId: string,
  copy: { title: string; body: string },
  schedule: ReminderScheduleRule,
): ReminderNotificationRequest[] {
  if (schedule.kind === "none") return [];
  if (schedule.kind === "daily") {
    return [{
      identifier: notificationId(reminderId),
      reminderId,
      title: copy.title,
      body: copy.body,
      trigger: schedule,
    }];
  }
  if (schedule.kind === "timeInterval") {
    return [{
      identifier: notificationId(reminderId),
      reminderId,
      title: copy.title,
      body: copy.body,
      trigger: schedule,
    }];
  }

  return schedule.weekdays.map((weekday) => ({
    identifier: notificationId(reminderId, weekday),
    reminderId,
    title: copy.title,
    body: copy.body,
    trigger: { kind: "weekly", weekday, hour: schedule.hour, minute: schedule.minute },
  }));
}

function toExpoTrigger(trigger: ReminderNotificationRequest["trigger"]): Notifications.NotificationTriggerInput {
  if (trigger.kind === "daily") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  }
  if (trigger.kind === "timeInterval") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      channelId: REMINDER_CHANNEL_ID,
      seconds: trigger.seconds,
      repeats: trigger.repeats,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    channelId: REMINDER_CHANNEL_ID,
    weekday: trigger.weekday,
    hour: trigger.hour,
    minute: trigger.minute,
  };
}

export function buildReminderNotificationRequests(
  groups: ReminderGroup[],
  state: Record<string, boolean>,
): ReminderNotificationRequest[] {
  const requests: ReminderNotificationRequest[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (!state[item.id]) continue;
      const copy = reminderCopy[item.id];
      if (!copy) continue;
      requests.push(...buildTriggerRequests(item.id, copy, item.schedule));
    }
  }

  return requests;
}

export async function loadReminderState(groups: ReminderGroup[]): Promise<Record<string, boolean>> {
  const defaults = defaultStateForGroups(groups);
  const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return defaults;
    const merged = { ...defaults };
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") merged[key] = value;
    }
    return merged;
  } catch {
    return defaults;
  }
}

export async function saveReminderState(state: Record<string, boolean>): Promise<void> {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(state));
}

async function cancelLeanientReminderNotifications(adapter: ReminderNotificationAdapter): Promise<number> {
  const scheduled = await adapter.getAllScheduledNotificationsAsync();
  const leanientReminders = scheduled.filter((request) => request.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX));
  await Promise.all(leanientReminders.map((request) => adapter.cancelScheduledNotificationAsync(request.identifier)));
  return leanientReminders.length;
}

async function ensurePermission(adapter: ReminderNotificationAdapter): Promise<ReminderPermissionStatus> {
  const existing = await adapter.getPermissionsAsync();
  if (existing.granted || existing.status === "granted") return "granted";

  const requested = await adapter.requestPermissionsAsync();
  return normalizePermissionStatus(requested.status, requested.granted);
}

export async function syncReminderNotifications(
  groups: ReminderGroup[],
  state: Record<string, boolean>,
  adapter: ReminderNotificationAdapter = expoReminderNotificationAdapter,
): Promise<{ permissionStatus: ReminderPermissionStatus; scheduledCount: number; canceledCount: number }> {
  await adapter.prepareAsync?.();
  const canceledCount = await cancelLeanientReminderNotifications(adapter);
  const requests = buildReminderNotificationRequests(groups, state);

  if (requests.length === 0) {
    return { permissionStatus: "undetermined", scheduledCount: 0, canceledCount };
  }

  const permissionStatus = await ensurePermission(adapter);
  if (permissionStatus !== "granted") {
    return { permissionStatus, scheduledCount: 0, canceledCount };
  }

  await Promise.all(
    requests.map((request) =>
      adapter.scheduleNotificationAsync({
        identifier: request.identifier,
        content: {
          title: request.title,
          body: request.body,
          data: { reminderId: request.reminderId },
        },
        trigger: request.trigger,
      }),
    ),
  );

  return { permissionStatus, scheduledCount: requests.length, canceledCount };
}
