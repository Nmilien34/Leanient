import type {
  DoseLog,
  GoalPace,
  MealLog,
  MuscleRetentionSnapshot,
  UserProfile,
  WeightLog,
  WorkoutLog,
} from "@leanient/shared";

/**
 * Pure builders for the Progress redesign (design/progress.html). Everything
 * here is derived from real logs and normalized to 0..1 chart space so the
 * SVG components stay dumb and these stay testable.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PACE_LB_PER_WEEK: Record<GoalPace, number> = { gentle: 0.5, steady: 1.0, aggressive: 1.5 };
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const dateLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** Local YYYY-MM-DD key, so days bucket in the user's own timezone. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/** Weigh-ins averaged into 7-day buckets from the first log: the calm trend. */
function weeklyAverages(sorted: WeightLog[]): Array<{ t: number; value: number }> {
  if (sorted.length === 0) return [];
  const t0 = new Date(sorted[0].measuredAt).getTime();
  const buckets = new Map<number, { sum: number; n: number; t: number }>();
  for (const log of sorted) {
    const t = new Date(log.measuredAt).getTime();
    const idx = Math.floor((t - t0) / WEEK_MS);
    const cur = buckets.get(idx) ?? { sum: 0, n: 0, t: 0 };
    cur.sum += log.value;
    cur.n += 1;
    cur.t = Math.max(cur.t, t);
    buckets.set(idx, cur);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => ({ t: b.t, value: b.sum / b.n }));
}

export interface ChartXY {
  x: number; // 0..1, left → right
  y: number; // 0..1, top → bottom (already screen-oriented)
}

/* ============================== header ============================== */

export interface ProgressHeaderView {
  title: string;
  sub: string;
}

/**
 * Coach greeting instead of a screen name. Early days get the "picture builds
 * fast" frame; from week 2 the greeting counts the showing up.
 */
export function buildProgressHeader(args: {
  weightLogs: WeightLog[];
  weeksOnMed: number | null;
  now: Date;
}): ProgressHeaderView {
  const { weightLogs, weeksOnMed, now } = args;
  const sorted = [...weightLogs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const first = sorted[0];
  const daysIn = first
    ? Math.max(1, Math.round((now.getTime() - new Date(first.measuredAt).getTime()) / DAY_MS) + 1)
    : null;

  if (weightLogs.length === 0) {
    return { title: "Your picture starts here.", sub: "Every log builds what you see on this screen." };
  }
  if ((weeksOnMed ?? 0) < 2 && daysIn != null && daysIn <= 13) {
    const n = weightLogs.length;
    return {
      title: `Day ${daysIn}. The picture builds fast.`,
      sub: `${n === 1 ? "One weigh-in" : `${n} weigh-ins`} in. Every log sharpens the line.`,
    };
  }
  const weeks = weeksOnMed ?? Math.max(1, Math.floor((daysIn ?? 7) / 7));
  return {
    title: `${weeks} ${weeks === 1 ? "week" : "weeks"} of showing up.`,
    sub: "Everything here is built from what you logged.",
  };
}

/* ============================ weight trend ============================ */

export interface WeightTrendView {
  /** Smoothed weekly trend, normalized. */
  trend: ChartXY[];
  /** Raw daily weigh-ins, normalized (the faint noise dots). */
  noise: ChartXY[];
  /** Early mode: dotted line from the latest point toward the goal. */
  projection: ChartXY[] | null;
  early: boolean;
  deltaLabel: string; // "↓ 14 lb"
  startLabel: string; // "226"
  nowLabel: string; // "212 now"
  axis: [string, string, string];
  note: string;
}

/**
 * The weight chart as the smoothed WEEKLY trend with raw weigh-ins demoted to
 * faint dots. Under three weekly buckets it switches to early mode: the raw
 * points draw the line and a dotted projection shows where it's headed.
 */
export function buildWeightTrend(args: {
  weightLogs: WeightLog[];
  goalWeight: number | null | undefined;
  now: Date;
}): WeightTrendView | null {
  const { weightLogs, goalWeight, now } = args;
  if (weightLogs.length === 0) return null;

  const sorted = [...weightLogs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const t0 = new Date(sorted[0].measuredAt).getTime();
  const tEnd = now.getTime();
  const spanT = Math.max(tEnd - t0, DAY_MS);

  const weekly = weeklyAverages(sorted);

  const early = weekly.length < 3;
  const trendSeries = early ? sorted.map((l) => ({ t: new Date(l.measuredAt).getTime(), value: l.value })) : weekly;

  const start = sorted[0].value;
  const current = sorted[sorted.length - 1].value;
  const unit = sorted[sorted.length - 1].unit ?? "lb";
  const lost = start - current;

  const goal = goalWeight ?? null;
  const projecting = early && goal != null && goal < current;

  // Shared y-domain across trend, noise, and projection target.
  const values = [...trendSeries.map((p) => p.value), ...sorted.map((l) => l.value)];
  if (projecting) values.push(goal);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spanV = Math.max(max - min, 0.1);
  const toY = (v: number) => clamp01((max - v) / spanV);
  const toX = (t: number) => clamp01((t - t0) / spanT);

  // Early mode reserves the right side of the chart for the projection.
  const xScale = projecting ? 0.28 : 1;
  const trend = trendSeries.map((p) => ({ x: toX(p.t) * xScale, y: toY(p.value) }));
  const noise = early ? [] : sorted.map((l) => ({ x: toX(new Date(l.measuredAt).getTime()), y: toY(l.value) }));
  const projection = projecting ? [trend[trend.length - 1], { x: 1, y: toY(goal) }] : null;

  const weeksSpanned = Math.max(1, Math.ceil((tEnd - t0) / WEEK_MS));
  const axis: [string, string, string] = early
    ? ["DAY 1", "TODAY", projecting ? "GOAL" : "AHEAD"]
    : ["WEEK 1", `WEEK ${Math.max(2, Math.ceil(weeksSpanned / 2))}`, "TODAY"];

  const deltaLabel =
    lost >= 0.5 ? `↓ ${Math.round(lost)} ${unit}` : lost <= -0.5 ? `↑ ${Math.round(-lost)} ${unit}` : "holding steady";

  const note = early
    ? sorted.length === 1
      ? "One point down. Your next weigh-in draws the direction."
      : lost >= 0.1
        ? "Two points already make a direction. It's the right one."
        : "The first points settle before the trend shows. Keep logging."
    : "The line is your weekly trend. The faint dots are daily noise, ignore them.";

  return {
    trend,
    noise,
    projection,
    early,
    deltaLabel,
    startLabel: `${Math.round(start)}`,
    nowLabel: `${Math.round(current)} now`,
    axis,
    note,
  };
}

/* ============================= goal path ============================= */

export type GoalPathStatus = "ahead" | "on_plan" | "cruising" | "building";

export interface GoalPathView {
  status: GoalPathStatus;
  /** Header read: "12 days ahead" / "right on plan" / "goal ~ Jan 5". */
  headline: string;
  goalLabel: string; // "185 LB"
  /** Your logged line, normalized. */
  actual: ChartXY[];
  /** Dotted continuation of your real pace, from today to the goal. */
  yourPath: ChartXY[] | null;
  /** The dashed onboarding plan line, start → goal at the chosen pace. */
  plan: [ChartXY, ChartXY];
  /** Marker at (today, current weight). */
  today: ChartXY;
  /** The flag at the plan's arrival date. */
  planEnd: ChartXY;
  yourEtaLabel: string | null; // "your pace · Jan 5"
  planEtaLabel: string; // "plan · Jan 17"
  chips: Array<{ text: string; em?: boolean }>;
}

/** Weigh-ins needed before the plan line means anything. */
export const GOAL_PATH_MIN_LOGS = 3;

/**
 * Your actual line against the plan line you set at onboarding (goal weight +
 * pace → date). Ahead is a chip, never a judgment; behind reads as a neutral
 * arrival estimate.
 */
export function buildGoalPath(args: {
  weightLogs: WeightLog[];
  profile: Pick<UserProfile, "goalWeight" | "goalWeightUnit" | "goalPace"> | null | undefined;
  now: Date;
}): GoalPathView | null {
  const { weightLogs, profile, now } = args;
  if (!profile?.goalWeight || weightLogs.length < GOAL_PATH_MIN_LOGS) return null;

  const sorted = [...weightLogs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const start = sorted[0];
  const latest = sorted[sorted.length - 1];
  const goal = profile.goalWeight;
  const unit = (latest.unit ?? profile.goalWeightUnit ?? "lb").toUpperCase();
  if (goal >= start.value) return null; // goal above start: no downhill path to draw

  const t0 = new Date(start.measuredAt).getTime();
  const tNow = now.getTime();

  const planPace = PACE_LB_PER_WEEK[profile.goalPace ?? "steady"];
  const planEtaT = t0 + ((start.value - goal) / planPace) * WEEK_MS;

  // Real pace so far: overall drop over elapsed time. Needs a few days of
  // history before it stops being noise; until then the read stays neutral.
  const elapsedWeeks = (tNow - t0) / WEEK_MS;
  const actualPace = elapsedWeeks > 0 ? (start.value - latest.value) / elapsedWeeks : 0;
  const trendingDown = actualPace > 0.05 && latest.value > goal;
  const yourEtaT = trendingDown ? tNow + ((latest.value - goal) / actualPace) * WEEK_MS : null;

  const tMax = Math.max(planEtaT, yourEtaT ?? 0, tNow) || planEtaT;
  const spanT = Math.max(tMax - t0, DAY_MS);
  const spanV = Math.max(start.value - goal, 0.1);
  const toX = (t: number) => clamp01((t - t0) / spanT);
  const toY = (v: number) => clamp01((start.value - v) / spanV);

  // The drawn line is the weekly trend (the mock's calm line), ending at the
  // latest weigh-in so it meets the today marker.
  const weekly = weeklyAverages(sorted);
  const trendPts = [...weekly.slice(0, -1), { t: new Date(latest.measuredAt).getTime(), value: latest.value }];
  const actual = trendPts.map((p) => ({ x: toX(p.t), y: toY(p.value) }));
  const today = { x: toX(tNow), y: toY(latest.value) };
  const plan: [ChartXY, ChartXY] = [{ x: 0, y: 0 }, { x: toX(planEtaT), y: 1 }];
  const planEnd = plan[1];
  const yourPath = yourEtaT ? [today, { x: toX(yourEtaT), y: 1 }] : null;

  const planEtaLabel = `plan · ${dateLabel(new Date(planEtaT))}`;
  const yourEtaLabel = yourEtaT ? `your pace · ${dateLabel(new Date(yourEtaT))}` : null;

  const daysAhead = yourEtaT ? Math.round((planEtaT - yourEtaT) / DAY_MS) : null;
  let status: GoalPathStatus;
  let headline: string;
  if (daysAhead == null) {
    status = "building";
    headline = "trend settling";
  } else if (daysAhead >= 4) {
    status = "ahead";
    // Big leads read in weeks so the number stays believable.
    headline = daysAhead >= 14 ? `${Math.round(daysAhead / 7)} weeks ahead` : `${daysAhead} days ahead`;
  } else if (daysAhead >= -3) {
    status = "on_plan";
    headline = "right on plan";
  } else {
    status = "cruising";
    headline = `goal ~ ${dateLabel(new Date(yourEtaT as number))}`;
  }

  const chips: GoalPathView["chips"] = [];
  if (yourEtaLabel) chips.push({ text: yourEtaLabel, em: true });
  chips.push({ text: planEtaLabel });
  chips.push({ text: "set at onboarding" });

  return {
    status,
    headline,
    goalLabel: `${Math.round(goal)} ${unit}`,
    actual,
    yourPath,
    plan,
    today,
    planEnd,
    yourEtaLabel,
    planEtaLabel,
    chips,
  };
}

/* ============================ coach line ============================ */

/** The one-line coach read under the graphs, keyed to the goal-path status. */
export function buildProgressCoachLine(args: {
  goalPath: GoalPathView | null;
  header: ProgressHeaderView;
  weightLogs: WeightLog[];
  now: Date;
}): string {
  const { goalPath, weightLogs, now } = args;
  if (weightLogs.length === 0) return "Log your first weigh-in and I'll take it from there.";

  const sorted = [...weightLogs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const daysIn = Math.max(1, Math.round((now.getTime() - new Date(sorted[0].measuredAt).getTime()) / DAY_MS) + 1);
  const moving = sorted[0].value - sorted[sorted.length - 1].value >= 0.1;

  if (!goalPath) {
    return daysIn <= 13 && moving
      ? `${daysIn} days in and already moving. I'm here all week.`
      : "Every log sharpens this picture. Keep them coming.";
  }
  switch (goalPath.status) {
    case "ahead":
      return "Ahead of your own plan. Keep the rhythm.";
    case "on_plan":
      return "Right on the plan you set. Keep the rhythm.";
    case "cruising":
      return "The line is moving. Steady is what wins this.";
    case "building":
      return "Your trend is still settling. The logs are doing the work.";
  }
}

/* ========================== consistency heat ========================== */

export interface HeatCell {
  level: 0 | 1 | 2;
  today: boolean;
}

export interface ConsistencyHeatView {
  cells: HeatCell[]; // oldest → today, 30 cells
  activeLabel: string; // "26 of 30"
  chips: Array<{ text: string; em?: boolean }>;
}

/**
 * The last 30 days as the work: one cell per day, level from how much got
 * logged (meals, sessions, weigh-ins, doses, check-ins). Today is outlined,
 * an unfinished today never reads as a miss.
 */
export function buildConsistencyHeat(args: {
  meals: Array<Pick<MealLog, "recordedAt">>;
  workouts: Array<Pick<WorkoutLog, "recordedAt">>;
  weightLogs: Array<Pick<WeightLog, "measuredAt">>;
  doseLogs: Array<Pick<DoseLog, "recordedAt">>;
  snapshots: Array<Pick<MuscleRetentionSnapshot, "weekOf">>;
  now: Date;
}): ConsistencyHeatView {
  const { meals, workouts, weightLogs, doseLogs, snapshots, now } = args;
  const days = 30;

  const counts = new Map<string, number>();
  const bump = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  meals.forEach((m) => bump(m.recordedAt));
  workouts.forEach((w) => bump(w.recordedAt));
  weightLogs.forEach((w) => bump(w.measuredAt));
  doseLogs.forEach((d) => bump(d.recordedAt));
  snapshots.forEach((s) => bump(`${s.weekOf}T12:00:00`));

  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const cells: HeatCell[] = [];
  let active = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const n = counts.get(dayKey(d)) ?? 0;
    const level: HeatCell["level"] = n >= 2 ? 2 : n === 1 ? 1 : 0;
    if (level > 0) active += 1;
    cells.push({ level, today: i === days - 1 });
  }

  const inWindow = (iso: string) => {
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getTime() >= windowStart.getTime();
  };
  const mealCount = meals.filter((m) => inWindow(m.recordedAt)).length;
  const sessionCount = workouts.filter((w) => inWindow(w.recordedAt)).length;
  const checkinCount = snapshots.filter((s) => inWindow(`${s.weekOf}T12:00:00`)).length;

  const chips: ConsistencyHeatView["chips"] = [];
  if (mealCount > 0) chips.push({ text: `${mealCount} meals`, em: true });
  if (sessionCount > 0) chips.push({ text: `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`, em: true });
  if (checkinCount > 0) chips.push({ text: `${checkinCount} ${checkinCount === 1 ? "check-in" : "check-ins"}`, em: true });
  chips.push({ text: "every log sharpens your reads" });

  return { cells, activeLabel: `${active} of ${days}`, chips };
}

/* ============================ locked reads ============================ */

export interface LockedRead {
  key: "goal_path" | "muscle_trend";
  title: string;
  sub: string;
  /** Unlock progress dots: filled of total. */
  dots: { filled: number; total: number };
}

/**
 * Reads that need more data say exactly which log unlocks them, with progress
 * dots so each log visibly moves the needle.
 */
export function buildLockedReads(args: {
  weighInCount: number;
  hasGoal: boolean;
  snapshotCount: number;
}): LockedRead[] {
  const { weighInCount, hasGoal, snapshotCount } = args;
  const reads: LockedRead[] = [];

  if (hasGoal && weighInCount < GOAL_PATH_MIN_LOGS) {
    const left = GOAL_PATH_MIN_LOGS - weighInCount;
    reads.push({
      key: "goal_path",
      title: "Goal path",
      sub: left === 1 ? "One more weigh-in unlocks your plan line." : `${left} more weigh-ins unlock your plan line.`,
      dots: { filled: weighInCount, total: GOAL_PATH_MIN_LOGS },
    });
  }
  if (snapshotCount === 0) {
    reads.push({
      key: "muscle_trend",
      title: "Muscle trend",
      sub: "Your first Sunday check-in starts this read.",
      dots: { filled: 0, total: 1 },
    });
  }
  return reads;
}

/* =========================== muscle trend =========================== */

export interface MuscleTrendView {
  points: ChartXY[];
  deltaLabel: string; // "↑ 6"
  deltaSuffix: string; // "since week 1"
  axis: [string, string];
}

/** The retention score series as a smooth rising read: "MUSCLE · KEPT ↑ 6". */
export function buildMuscleTrend(
  snapshots: MuscleRetentionSnapshot[],
  firstVisibleWeek: number,
): MuscleTrendView | null {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  const values = sorted.map((s) => s.muscleRetentionScore);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.1);
  const flat = max - min === 0;

  const points = sorted.map((s, i) => ({
    x: sorted.length > 1 ? i / (sorted.length - 1) : 0.5,
    y: flat ? 0.5 : clamp01((max - s.muscleRetentionScore) / span),
  }));

  const delta = Math.round(values[values.length - 1] - values[0]);
  const deltaLabel = delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : "steady";
  const wk0 = firstVisibleWeek + 1;
  const wkN = firstVisibleWeek + sorted.length;

  return {
    points,
    deltaLabel,
    deltaSuffix: delta !== 0 ? `since week ${wk0}` : "holding",
    axis: [`WEEK ${wk0}`, wkN > wk0 ? `WEEK ${wkN}` : "NOW"],
  };
}

/* ============================ photo spread ============================ */

export interface PhotoSpreadItem {
  id: string;
  uri?: string;
  label: string; // "WK 4"
}

/**
 * Up to three body photos spread across the journey (first, middle, latest)
 * for the Progress timeline row.
 */
export function buildPhotoSpread(
  photos: Array<{ id: string; captureDate: string; viewUrl?: string; kind: string }>,
  weekOf: (captureDate: string) => number | null,
): PhotoSpreadItem[] {
  const body = photos
    .filter((p) => p.kind === "body")
    .sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  if (body.length === 0) return [];

  const picks =
    body.length <= 3 ? body : [body[0], body[Math.floor((body.length - 1) / 2)], body[body.length - 1]];

  return picks.map((p) => {
    const wk = weekOf(p.captureDate);
    const d = new Date(p.captureDate);
    return {
      id: p.id,
      uri: p.viewUrl,
      label: wk != null ? `WK ${wk}` : Number.isNaN(d.getTime()) ? "" : dateLabel(d).toUpperCase(),
    };
  });
}
