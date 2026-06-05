export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcWeek(date: Date): Date {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = normalized.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  normalized.setUTCDate(normalized.getUTCDate() - daysSinceMonday);
  return normalized;
}

export function previousUtcWeekStart(date: Date): Date {
  const currentWeekStart = startOfUtcWeek(date);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
  return currentWeekStart;
}
