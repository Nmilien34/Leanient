import type { UserMedicationProtocol } from "@leanient/shared";

/**
 * FRONTEND-ONLY config for the Reminders screen (27). Defines the notification
 * rows + their default on/off, with subtitles and local notification schedules
 * that reflect the user's medication cadence.
 */

export type ReminderIcon = "bell" | "pill" | "heart" | "ruler" | "photo";

export type ReminderScheduleRule =
  | { kind: "weekly"; weekdays: number[]; hour: number; minute: number }
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "timeInterval"; seconds: number; repeats: true }
  | { kind: "none" };

export interface ReminderItem {
  id: string;
  icon: ReminderIcon;
  label: string;
  subtitle: string;
  defaultOn: boolean;
  schedule: ReminderScheduleRule;
}

export interface ReminderGroup {
  title: string;
  items: ReminderItem[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const expoWeekdayByLeanientDay: Record<UserMedicationProtocol["shotDays"][number], number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

export function deriveReminderGroups(args: { medication?: UserMedicationProtocol }): ReminderGroup[] {
  const shotDayName = args.medication ? args.medication.shotDays.map(cap).join(", ") : "shot day";
  const shotWeekdays = args.medication ? args.medication.shotDays.map((day) => expoWeekdayByLeanientDay[day]) : [];

  return [
    {
      title: "COACHING",
      items: [
        { id: "verdict", icon: "bell", label: "Weekly verdict", subtitle: "Sundays at 9:00 AM", defaultOn: true, schedule: { kind: "weekly", weekdays: [1], hour: 9, minute: 0 } },
        { id: "protein", icon: "pill", label: "Protein nudges", subtitle: "Midday check-in", defaultOn: true, schedule: { kind: "daily", hour: 12, minute: 0 } },
        { id: "shot_day", icon: "pill", label: "Shot day reminder", subtitle: `${shotDayName} morning`, defaultOn: true, schedule: { kind: "weekly", weekdays: shotWeekdays, hour: 9, minute: 0 } },
        { id: "workout", icon: "heart", label: "Workout reminders", subtitle: "Mon, Wed, Fri evenings", defaultOn: true, schedule: { kind: "weekly", weekdays: [2, 4, 6], hour: 18, minute: 0 } },
      ],
    },
    {
      title: "CHECK-INS",
      items: [
        { id: "weigh_in", icon: "ruler", label: "Weekly weigh-in", subtitle: "Sunday morning", defaultOn: true, schedule: { kind: "weekly", weekdays: [1], hour: 8, minute: 0 } },
        { id: "progress_photo", icon: "photo", label: "Progress photo", subtitle: "Every 2 weeks", defaultOn: false, schedule: { kind: "timeInterval", seconds: 14 * 24 * 60 * 60, repeats: true } },
      ],
    },
    {
      title: "QUIET HOURS",
      items: [{ id: "quiet_hours", icon: "bell", label: "Pause notifications", subtitle: "10:00 PM to 7:00 AM", defaultOn: true, schedule: { kind: "none" } }],
    },
  ];
}

/** Flatten the groups to an id→default map for the screen's initial toggle state. */
export function defaultReminderState(groups: ReminderGroup[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const g of groups) for (const i of g.items) state[i.id] = i.defaultOn;
  return state;
}
