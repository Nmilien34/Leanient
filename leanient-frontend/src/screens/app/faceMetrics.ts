/**
 * FRONTEND, on-device facial-volume math for Phase 2b. The native detector
 * (Apple Vision) only produces normalized landmark geometry; every measurement
 * lives here as pure, testable functions so the unverified native surface stays
 * tiny. Nothing here leaves the device — these numbers are stored locally.
 *
 * This is an on-device estimate of facial proportions, not a medical measurement.
 */

export const FACE_METRICS_ENGINE_VERSION = "v1.0";

/** A normalized point in image space: x,y in [0,1], origin top-left, y down. */
export interface FacePoint {
  x: number;
  y: number;
}

/** What the native detector returns for one face. */
export interface FaceLandmarks {
  /** Face-contour (jaw + cheek outline) points, normalized. */
  contour: FacePoint[];
  /** Normalized bounding box of the detected face. */
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface FaceMetric {
  /** The face check this measures, YYYY-MM-DD. */
  captureDate: string;
  /** Widest face width (cheek/zygomatic) over face height. */
  cheekWidthRatio: number;
  /** Jaw width (lower face) over face height. */
  jawWidthRatio: number;
  /**
   * A single on-device fullness number: cheek width as a percent of face
   * height. Higher reads fuller. Not a calibrated score; the trend is the
   * signal (a thinning face narrows relative to its height).
   */
  facialVolumeIndex: number;
  engineVersion: string;
  computedAt: string;
}

const round2 = (n: number): number => Number(n.toFixed(2));
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function horizontalSpan(points: FacePoint[]): number {
  if (points.length === 0) return 0;
  let min = points[0].x;
  let max = points[0].x;
  for (const p of points) {
    if (p.x < min) min = p.x;
    if (p.x > max) max = p.x;
  }
  return max - min;
}

/**
 * Derive facial proportions from contour geometry. Returns null when the
 * geometry is too sparse or degenerate to measure (so the caller falls back to
 * the self-rated fullness instead of storing a junk number).
 */
export function computeFaceMetrics(
  landmarks: FaceLandmarks,
  opts: { captureDate: string; computedAt: string },
): FaceMetric | null {
  const { contour, boundingBox } = landmarks;
  const faceHeight = boundingBox.height;
  if (contour.length < 5 || faceHeight <= 0) return null;

  // Widest part of the face (cheekbones / zygomatic), across the whole contour.
  const cheekWidth = horizontalSpan(contour);
  // Jaw width: the lower 40% of the contour (toward the chin).
  const jawCutoff = boundingBox.y + faceHeight * 0.6;
  const lower = contour.filter((p) => p.y >= jawCutoff);
  const jawWidth = lower.length >= 2 ? horizontalSpan(lower) : cheekWidth;

  if (cheekWidth <= 0) return null;

  const cheekWidthRatio = round2(cheekWidth / faceHeight);
  const jawWidthRatio = round2(jawWidth / faceHeight);
  const facialVolumeIndex = clamp(Math.round(cheekWidthRatio * 100), 0, 100);

  return {
    captureDate: opts.captureDate,
    cheekWidthRatio,
    jawWidthRatio,
    facialVolumeIndex,
    engineVersion: FACE_METRICS_ENGINE_VERSION,
    computedAt: opts.computedAt,
  };
}

export interface FaceVolumeTrend {
  latestIndex: number;
  /** latest minus first index; 0 until there are two measurements. */
  delta: number;
  direction: "holding" | "fuller" | "thinner";
  line: string;
}

// PRODUCT_TUNING: a couple of index points is within capture noise, so only a
// move beyond it reads as a real direction.
const VOLUME_TREND_THRESHOLD = 2;

/**
 * Turn the stored measurements into a one-line facial-volume trend. Compares the
 * latest measurement to the first; needs two to call a direction. Null when there
 * are no measurements yet.
 */
export function buildFaceVolumeTrend(metrics: FaceMetric[]): FaceVolumeTrend | null {
  if (metrics.length === 0) return null;

  const sorted = [...metrics].sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const latestIndex = sorted[sorted.length - 1].facialVolumeIndex;

  if (sorted.length < 2) {
    return {
      latestIndex,
      delta: 0,
      direction: "holding",
      line: "First on-device measurement saved. A few weeks of checks will show the trend.",
    };
  }

  const delta = latestIndex - sorted[0].facialVolumeIndex;
  if (delta <= -VOLUME_TREND_THRESHOLD) {
    return {
      latestIndex,
      delta,
      direction: "thinner",
      line: "Facial volume is trending down. More protein and a gentler loss pace help your face hold.",
    };
  }
  if (delta >= VOLUME_TREND_THRESHOLD) {
    return {
      latestIndex,
      delta,
      direction: "fuller",
      line: "Facial volume is holding up well. Keep your protein where it is.",
    };
  }
  return { latestIndex, delta, direction: "holding", line: "Facial volume steady since your first measurement." };
}
