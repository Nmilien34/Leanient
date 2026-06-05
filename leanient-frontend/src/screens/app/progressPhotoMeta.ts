/**
 * FRONTEND helpers for the Progress photo screen (39). The week label is derived
 * from the protocol start date (which week of the journey this photo belongs
 * to); poses are the front/side/back framings.
 */

export const POSES = ["Front", "Side", "Back"] as const;
export type Pose = (typeof POSES)[number];

/** Which week of the protocol we're in (1-based), for the "PROGRESS · WK n" pill. */
export function progressWeekNumber(startDate: string | undefined, now: Date): number {
  if (!startDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  return Math.floor(days / 7) + 1;
}
