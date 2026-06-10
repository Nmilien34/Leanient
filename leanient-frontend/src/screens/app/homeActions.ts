import type { TodaysFocusActionType } from "@leanient/shared";

export type PrimaryFocusActionIntent =
  | "meal_scan"
  | "workout"
  | "dose"
  | "photo"
  | "progress"
  | "none";

export type SecondaryFocusAction = {
  intent: "meal_manual";
  label: string;
};

export function createOpenProgressPhotoAction(openProgressPhoto: () => void): () => void {
  return () => openProgressPhoto();
}

export function getPrimaryFocusActionIntent(actionType?: TodaysFocusActionType | null): PrimaryFocusActionIntent {
  switch (actionType) {
    case "log_meal":
      return "meal_scan";
    case "log_workout":
      return "workout";
    case "log_dose":
      return "dose";
    case "take_photo":
      return "photo";
    case "view_progress":
      return "progress";
    case "none":
    default:
      return "none";
  }
}

export function getSecondaryFocusAction(actionType?: TodaysFocusActionType | null): SecondaryFocusAction | null {
  if (actionType !== "log_meal") return null;

  return {
    intent: "meal_manual",
    label: "Log this meal manually",
  };
}
