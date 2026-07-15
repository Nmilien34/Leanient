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

  // Cycle offsets in expo weekday space (1=Sun..7=Sat): the reminders follow
  // the shot, not the calendar. Fallbacks cover users without a protocol.
  const offsetDays = (offset: number, fallback: number[]): number[] =>
    shotWeekdays.length ? shotWeekdays.map((d) => ((((d - 1 + offset) % 7) + 7) % 7) + 1) : fallback;
  // Guard evenings are the 1-2 days BEFORE each shot, so any frequency
  // (twice-weekly, split doses) lands them correctly; shot days themselves
  // are excluded (that evening belongs to the reset ritual).
  const guardDays = [...new Set([...offsetDays(-1, [6]), ...offsetDays(-2, [5])])]
    .filter((d) => !shotWeekdays.includes(d))
    .sort((a, b) => a - b);
  const strongDays = [...new Set([...offsetDays(2, [2]), ...offsetDays(3, [4])])].sort((a, b) => a - b);
  const truestDay = offsetDays(2, [2]);

  return [
    {
      title: "REMINDERS · FOLLOW YOUR CYCLE",
      items: [
        { id: "shot_day", icon: "pill", label: "Shot morning", subtitle: `${shotDayName} at 9:00 AM`, defaultOn: true, schedule: { kind: "weekly", weekdays: shotWeekdays.length ? shotWeekdays : [7], hour: 9, minute: 0 } },
        { id: "guard_evening", icon: "bell", label: "Guard-day evening", subtitle: "Days 5 and 6, before the window", defaultOn: true, schedule: { kind: "weekly", weekdays: guardDays, hour: 17, minute: 30 } },
        { id: "verdict", icon: "bell", label: "Sunday check-in", subtitle: "Your verdict follows it", defaultOn: true, schedule: { kind: "weekly", weekdays: [1], hour: 9, minute: 0 } },
        { id: "photo_day", icon: "photo", label: "Photo day", subtitle: "Shot day morning, with your plan", defaultOn: false, schedule: { kind: "weekly", weekdays: shotWeekdays.length ? shotWeekdays : [7], hour: 9, minute: 30 } },
      ],
    },
    {
      title: "DAILY",
      items: [
        { id: "protein", icon: "pill", label: "Protein nudge", subtitle: "Midday, if the morning ran light", defaultOn: true, schedule: { kind: "daily", hour: 12, minute: 0 } },
        { id: "workout", icon: "heart", label: "Session reminder", subtitle: "Your strongest days, day 2 and 3", defaultOn: true, schedule: { kind: "weekly", weekdays: strongDays, hour: 17, minute: 0 } },
        { id: "weigh_in", icon: "ruler", label: "Weigh-in", subtitle: "Day 2 morning, the truest read", defaultOn: true, schedule: { kind: "weekly", weekdays: truestDay, hour: 8, minute: 0 } },
      ],
    },
    {
      title: "QUIET HOURS",
      items: [{ id: "quiet_hours", icon: "bell", label: "Pause notifications", subtitle: "10:00 PM to 7:00 AM", defaultOn: true, schedule: { kind: "none" } }],
    },
  ];
}

export function defaultReminderState(groups: ReminderGroup[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const g of groups) for (const i of g.items) state[i.id] = i.defaultOn;
  return state;
}
