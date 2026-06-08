import type { VerdictStatus, WeightMeasurement } from "@leanient/shared";
import { colors } from "../../theme/tokens";

/** Shared labels/formatting for the check-in history list + detail. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const VERDICT_STATUS_TEXT: Record<VerdictStatus, string> = {
  on_track: "Keeping muscle",
  drifting: "Drifting",
  losing_muscle: "Losing muscle",
  no_data: "Gathering",
};

export const VERDICT_STATUS_COLOR: Record<VerdictStatus, string> = {
  on_track: colors.emeraldDeep,
  drifting: colors.amberDeep,
  losing_muscle: colors.slate,
  no_data: colors.muted,
};

/** "Week of Jun 1" from a date-only weekOf. */
export function checkinWeekLabel(weekOf: string): string {
  const d = new Date(`${weekOf}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "This week";
  return `Week of ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatWeight(weight: WeightMeasurement): string {
  return `${weight.value} ${weight.unit}`;
}
