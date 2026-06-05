import type { DoseLog, UserMedicationProtocol } from "@leanient/shared";

export interface ShotDayContext {
  isOnProtocol: boolean;
  daysSinceLastDose: number | null;
  daysUntilNextDose: number | null;
  shotDayLabel: string | null;
  nextDoseDate: Date | null;
}

const WEEKLY_CADENCE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcDayDifference(left: Date, right: Date): number {
  return Math.floor((startOfUtcDay(left).getTime() - startOfUtcDay(right).getTime()) / MS_PER_DAY);
}

function mostRecentDoseDate(recentDoseLogs: DoseLog[]): Date | null {
  const dates = recentDoseLogs
    .filter((dose) => !dose.deletedAt)
    .map((dose) => new Date(dose.recordedAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) {
    return null;
  }

  return dates.sort((left, right) => right.getTime() - left.getTime())[0];
}

export function computeShotDayContext(
  protocol: UserMedicationProtocol | null,
  recentDoseLogs: DoseLog[],
  today: Date = new Date(),
): ShotDayContext {
  if (!protocol || protocol.active === false) {
    return {
      isOnProtocol: false,
      daysSinceLastDose: null,
      daysUntilNextDose: null,
      shotDayLabel: null,
      nextDoseDate: null,
    };
  }

  const lastDoseDate = startOfUtcDay(
    mostRecentDoseDate(recentDoseLogs) ?? new Date(`${protocol.startDate}T00:00:00.000Z`),
  );
  const daysSinceLastDose = Math.max(0, utcDayDifference(today, lastDoseDate));

  // TODO: if daily-dosed medications are added later, this needs to become
  // protocol-driven. cadenceDays does not exist on UserMedicationProtocol today.
  const nextDoseDate = addUtcDays(lastDoseDate, WEEKLY_CADENCE_DAYS);
  const daysUntilNextDose = Math.max(0, utcDayDifference(nextDoseDate, today));
  const cycleDay = daysSinceLastDose % WEEKLY_CADENCE_DAYS;
  const shotDayLabel = cycleDay === 0 ? "SHOT DAY" : `SHOT DAY +${cycleDay}`;

  return {
    isOnProtocol: true,
    daysSinceLastDose,
    daysUntilNextDose,
    shotDayLabel,
    nextDoseDate,
  };
}
