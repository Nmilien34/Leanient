import type { Weekday } from "@leanient/shared";

/**
 * Frame 06 of the onboarding conversation — the belonging beat after shot day:
 * the answer is met ("Saturdays. Locked in."), then the population stat says
 * they're in good company. Drug-aware and never invented: semaglutide brands
 * get the IQVIA semaglutide number; everyone else gets the KFF GLP-1 read
 * already cited on the welcome screen.
 */
export interface BelongingView {
  context: string;
  statNum: string;
  statLine: string;
  statCite: string;
}

export const DAY_LABEL: Record<Weekday, string> = {
  monday: "Mondays",
  tuesday: "Tuesdays",
  wednesday: "Wednesdays",
  thursday: "Thursdays",
  friday: "Fridays",
  saturday: "Saturdays",
  sunday: "Sundays",
};

const SEMAGLUTIDE_RE = /wegovy|ozempic|rybelsus|semaglutide/i;

export function buildBelonging(args: {
  shotDays: Weekday[] | undefined;
  medicationName: string | null | undefined;
}): BelongingView {
  const { shotDays, medicationName } = args;

  const days = (shotDays ?? []).map((d) => DAY_LABEL[d]).filter(Boolean);
  const context = days.length > 0 ? `${days.join(" + ")}. Locked in.` : "Locked in.";

  const semaglutide = medicationName != null && SEMAGLUTIDE_RE.test(medicationName);
  if (semaglutide) {
    return {
      context,
      statNum: "4.1M+",
      statLine:
        "Americans take semaglutide right now. The hunger waves, the quiet days, the day-5 creep: all of it is normal, and all of it is plannable.",
      statCite: "IQVIA National Prescription Audit",
    };
  }
  return {
    context,
    statNum: "15M+",
    statLine:
      "Americans are on a GLP-1 right now. The hunger waves, the quiet days, the late-week creep: all of it is normal, and all of it is plannable.",
    statCite: "KFF Health Tracking Poll",
  };
}
