import type { UserMedicationProtocol } from "@leanient/shared";

/**
 * FRONTEND-ONLY config for the Reminders screen (27). Defines the notification
 * rows + their default on/off, with subtitles that reflect the user's schedule
 * (e.g. the shot-day reminder names the real shot day). There's no notification
 * preferences contract yet, so the on/off state is held locally by the screen
 * and these defaults stand in until that contract exists.
 */

export type ReminderIcon = "bell" | "pill" | "heart" | "ruler" | "photo";

export interface ReminderItem {
  id: string;
  icon: ReminderIcon;
  label: string;
  subtitle: string;
  defaultOn: boolean;
}

export interface ReminderGroup {
  title: string;
  items: ReminderItem[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function deriveReminderGroups(args: { medication?: UserMedicationProtocol }): ReminderGroup[] {
  const shotDayName = args.medication ? cap(args.medication.shotDay) : "shot day";

  return [
    {
      title: "COACHING",
      items: [
        { id: "verdict", icon: "bell", label: "Weekly verdict", subtitle: "Sundays at 9:00 AM", defaultOn: true },
        { id: "protein", icon: "pill", label: "Protein nudges", subtitle: "When you're behind at midday", defaultOn: true },
        { id: "shot_day", icon: "pill", label: "Shot day reminder", subtitle: `${shotDayName} morning`, defaultOn: true },
        { id: "workout", icon: "heart", label: "Workout reminders", subtitle: "On training days", defaultOn: true },
      ],
    },
    {
      title: "CHECK-INS",
      items: [
        { id: "weigh_in", icon: "ruler", label: "Weekly weigh-in", subtitle: "Sunday morning", defaultOn: true },
        { id: "progress_photo", icon: "photo", label: "Progress photo", subtitle: "Every 2 weeks", defaultOn: false },
      ],
    },
    {
      title: "QUIET HOURS",
      items: [{ id: "quiet_hours", icon: "bell", label: "Pause notifications", subtitle: "10:00 PM to 7:00 AM", defaultOn: true }],
    },
  ];
}

/** Flatten the groups to an id→default map for the screen's initial toggle state. */
export function defaultReminderState(groups: ReminderGroup[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const g of groups) for (const i of g.items) state[i.id] = i.defaultOn;
  return state;
}
