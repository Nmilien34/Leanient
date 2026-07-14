import type { StreakRead } from "./streak";

/**
 * Frame 10: dignified medals tied to real journey feats, every state derived
 * from actual logs. Locked medals name their exact progress.
 */
export interface MedalView {
  key: string;
  name: string;
  earned: boolean;
  /** Date for earned ("Jun 28"), progress for locked ("12 of 14 days"). */
  sub: string;
  /** Locked progress 0..1 for the mini bar. */
  pct?: number;
  /** Amber medal face (streak feats). */
  amber?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export function buildMedals(args: {
  doseLogs: Array<{ recordedAt: string }>;
  weightLogs: Array<{ value: number; measuredAt: string }>;
  /** Verdict snapshots (weekOf ISO date strings). */
  snapshotWeeks: string[];
  /** Progress photo capture dates. */
  photoDates: string[];
  streak: StreakRead;
  now: Date;
}): MedalView[] {
  const { doseLogs, weightLogs, snapshotWeeks, photoDates, streak, now } = args;
  const medals: MedalView[] = [];

  // First shot logged.
  const firstDose = doseLogs.length
    ? doseLogs.reduce((a, b) => (a.recordedAt < b.recordedAt ? a : b))
    : null;
  medals.push({
    key: "first-shot",
    name: "First shot logged",
    earned: firstDose != null,
    sub: firstDose ? dateLabel(firstDose.recordedAt) : "Log your first dose",
    pct: firstDose ? undefined : 0,
  });

  // First verdict.
  const firstWeek = snapshotWeeks.length ? [...snapshotWeeks].sort()[0] : null;
  medals.push({
    key: "first-verdict",
    name: "First verdict in",
    earned: firstWeek != null,
    sub: firstWeek ? dateLabel(firstWeek) : "Your first check-in starts it",
    pct: firstWeek ? undefined : 0,
  });

  // 10 lb down: the log that crossed the line carries the date.
  const sorted = [...weightLogs].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const start = sorted[0]?.value ?? null;
  let crossedAt: string | null = null;
  let lost = 0;
  if (start != null) {
    for (const log of sorted) {
      lost = Math.max(lost, start - log.value);
      if (crossedAt == null && start - log.value >= 10) crossedAt = log.measuredAt;
    }
  }
  medals.push({
    key: "ten-down",
    name: "10 lb down",
    earned: crossedAt != null,
    sub: crossedAt ? dateLabel(crossedAt) : `${Math.max(0, Math.round(lost))} of 10 lb`,
    pct: crossedAt ? undefined : Math.min(1, Math.max(0, lost / 10)),
  });

  // Streak ladder feats.
  for (const [at, name] of [
    [7, "One steady week"],
    [14, "Two steady weeks"],
  ] as const) {
    const earned = streak.longest >= at;
    medals.push({
      key: `steady-${at}`,
      name,
      earned,
      sub: earned ? "in the bag" : `${streak.days} of ${at} days`,
      pct: earned ? undefined : Math.min(1, streak.days / at),
      amber: true,
    });
  }

  // Photo month: a photo in each of the last 4 calendar weeks.
  const weeksWithPhoto = new Set<number>();
  for (const iso of photoDates) {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) continue;
    const weeksAgo = Math.floor((now.getTime() - at.getTime()) / (7 * 86_400_000));
    if (weeksAgo >= 0 && weeksAgo < 4) weeksWithPhoto.add(weeksAgo);
  }
  const photoWeeks = weeksWithPhoto.size;
  medals.push({
    key: "photo-month",
    name: "Photo month",
    earned: photoWeeks >= 4,
    sub: photoWeeks >= 4 ? "4 straight weeks" : `${photoWeeks} of 4 weeks`,
    pct: photoWeeks >= 4 ? undefined : photoWeeks / 4,
  });

  // Earned first, keep ladder order otherwise.
  return [...medals.filter((m) => m.earned), ...medals.filter((m) => !m.earned)];
}
