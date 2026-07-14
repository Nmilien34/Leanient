/**
 * Settings · Doctor report (settings board frame 02): the journey as one
 * prescriber-ready summary, derived entirely from logs. v1 shares as text;
 * a rendered PDF can replace the share payload without touching callers.
 */
export interface DoctorReportView {
  rangeLabel: string;
  medLine: string | null;
  rows: Array<{ label: string; value: string }>;
  shareText: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export function buildDoctorReport(args: {
  displayName?: string | null;
  medicationName?: string | null;
  doseAmount?: number | null;
  doseUnit?: string | null;
  weightLogs: Array<{ value: number; unit: string; measuredAt: string }>;
  doseLogs: Array<{ recordedAt: string; injectionSite?: string | null }>;
  snapshots: Array<{ weekOf: string; retention: number }>;
  now: Date;
}): DoctorReportView | null {
  const { displayName, medicationName, doseAmount, doseUnit, weightLogs, doseLogs, snapshots, now } = args;

  const sortedWeights = [...weightLogs].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const first = sortedWeights[0] ?? null;
  const last = sortedWeights[sortedWeights.length - 1] ?? null;
  if (!first && !doseLogs.length && !snapshots.length) return null;

  const startTimes = [
    first ? new Date(first.measuredAt).getTime() : Number.POSITIVE_INFINITY,
    ...doseLogs.map((d) => new Date(d.recordedAt).getTime()),
  ].filter((t) => Number.isFinite(t));
  const rangeStart = startTimes.length ? new Date(Math.min(...startTimes)) : now;
  const rangeLabel = `${dateLabel(rangeStart)} – ${dateLabel(now)}`;

  const medLine = medicationName
    ? `${medicationName}${doseAmount != null ? ` · ${doseAmount} ${doseUnit ?? "mg"} weekly` : ""}`
    : null;

  const rows: Array<{ label: string; value: string }> = [];

  if (first && last && first !== last) {
    const delta = first.value - last.value;
    rows.push({
      label: "Weight",
      value: `${first.value} → ${last.value} ${last.unit} (${delta >= 0 ? "↓" : "↑"} ${Math.abs(delta).toFixed(1)})`,
    });
    const spanDays = (new Date(last.measuredAt).getTime() - new Date(first.measuredAt).getTime()) / 86_400_000;
    if (spanDays >= 14 && delta > 0) {
      rows.push({ label: "Loss pace", value: `${((delta / spanDays) * 7).toFixed(1)} ${last.unit} / week` });
    }
  } else if (last) {
    rows.push({ label: "Weight", value: `${last.value} ${last.unit}` });
  }

  if (snapshots.length) {
    const ordered = [...snapshots].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1));
    const latest = ordered[ordered.length - 1].retention;
    const trend =
      ordered.length > 1 ? (latest > ordered[0].retention ? " · trending up" : latest < ordered[0].retention ? " · easing" : " · holding") : "";
    rows.push({ label: "Muscle retention score", value: `${latest} / 100${trend}` });
    rows.push({ label: "Weekly check-ins", value: `${ordered.length}` });
  }

  if (doseLogs.length) {
    const sites = new Set(doseLogs.map((d) => d.injectionSite).filter(Boolean));
    rows.push({
      label: "Doses logged",
      value: `${doseLogs.length}${sites.size > 1 ? " · site rotation in use" : ""}`,
    });
  }

  const shareText = [
    `Leanient summary · ${rangeLabel}`,
    displayName ? `${displayName}${medLine ? ` · ${medLine}` : ""}` : medLine,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    "Self-tracked summary generated from user logs, for discussion with your prescriber.",
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  return { rangeLabel, medLine, rows, shareText };
}
