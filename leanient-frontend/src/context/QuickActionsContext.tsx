import { createContext, useContext } from "react";
import type { Workout } from "@leanient/shared";

/**
 * Openers for the global logging modals that live in MainTabs (dose log, progress
 * photo camera, guided workout player, quick-log sheet). Tab screens consume this
 * so in-screen buttons ("Start workout", "Log dose", "Add photo") can trigger the
 * same modals the quick-log "+" uses, instead of being dead.
 */
export interface QuickActions {
  openQuickLog: () => void;
  openMealScan: () => void;
  openMealLog: () => void;
  openDoseLog: () => void;
  openProgressPhoto: () => void;
  /** Open the camera in face-check mode (front camera + fullness rating). */
  openFaceCheck: () => void;
  /** Open the guided workout player. Pass a workout to play it; omit to use the
   * day's recommended workout. */
  startWorkout: (workout?: Workout) => void;
}

const QuickActionsContext = createContext<QuickActions | null>(null);

export const QuickActionsProvider = QuickActionsContext.Provider;

export function useQuickActions(): QuickActions {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) {
    throw new Error("useQuickActions must be used within a QuickActionsProvider");
  }
  return ctx;
}
