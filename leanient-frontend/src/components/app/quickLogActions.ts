export type QuickLogActionKey =
  | "scan_meal"
  | "coach"
  | "meal"
  | "workout"
  | "dose"
  | "weight"
  | "measurement"
  | "photo"
  | "side";

export interface QuickLogAction {
  key: QuickLogActionKey;
  label: string;
}

export const QUICK_LOG_ACTIONS: QuickLogAction[] = [
  { key: "scan_meal", label: "Scan meal" },
  { key: "coach", label: "Talk to your coach" },
  { key: "meal", label: "Manual meal" },
  { key: "workout", label: "Workout" },
  { key: "dose", label: "Dose" },
  { key: "weight", label: "Weight" },
  { key: "measurement", label: "Measurement" },
  { key: "photo", label: "Progress photo" },
  { key: "side", label: "Side effect" },
];
