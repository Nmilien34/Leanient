import { describe, expect, it } from "vitest";
import {
  buildFaceVolumeTrend,
  computeFaceMetrics,
  type FaceLandmarks,
  type FaceMetric,
  type FacePoint,
} from "../../screens/app/faceMetrics";

const OPTS = { captureDate: "2026-06-12", computedAt: "2026-06-12T10:00:00.000Z" };

/**
 * Build a face contour as an oval: `cheekFrac` sets the width at mid-height,
 * `jawFrac` the width at the bottom. Both are fractions of face height, so the
 * ratios come out predictable.
 */
function ovalFace(cheekFrac: number, jawFrac: number): FaceLandmarks {
  const cx = 0.5;
  const top = 0.1;
  const height = 0.8; // face height = 0.8 of the image
  const points: FacePoint[] = [];
  // widest at ~40% down (cheeks), narrowing to jawFrac at the chin
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const y = top + t * height;
    const widthFrac = t < 0.5 ? cheekFrac : cheekFrac - (cheekFrac - jawFrac) * ((t - 0.5) / 0.5);
    const halfW = (widthFrac * height) / 2;
    points.push({ x: cx - halfW, y });
    points.push({ x: cx + halfW, y });
  }
  return { contour: points, boundingBox: { x: cx - 0.3, y: top, width: 0.6, height } };
}

describe("computeFaceMetrics", () => {
  it("returns null for sparse or degenerate geometry", () => {
    expect(computeFaceMetrics({ contour: [{ x: 0.5, y: 0.5 }], boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5 } }, OPTS)).toBeNull();
    expect(
      computeFaceMetrics({ contour: ovalFace(0.7, 0.5).contour, boundingBox: { x: 0, y: 0, width: 0.6, height: 0 } }, OPTS),
    ).toBeNull();
  });

  it("derives cheek and jaw ratios and a volume index from the contour", () => {
    const metric = computeFaceMetrics(ovalFace(0.7, 0.5), OPTS)!;
    expect(metric.cheekWidthRatio).toBeCloseTo(0.7, 1);
    expect(metric.jawWidthRatio).toBeLessThan(metric.cheekWidthRatio); // jaw narrower than cheeks
    expect(metric.facialVolumeIndex).toBe(70); // cheek width is 70% of face height
    expect(metric.engineVersion).toBe("v1.0");
    expect(metric.captureDate).toBe("2026-06-12");
  });

  it("reads a thinner face as a lower volume index", () => {
    const full = computeFaceMetrics(ovalFace(0.74, 0.55), OPTS)!;
    const gaunt = computeFaceMetrics(ovalFace(0.62, 0.42), OPTS)!;
    expect(gaunt.facialVolumeIndex).toBeLessThan(full.facialVolumeIndex);
  });
});

const m = (captureDate: string, facialVolumeIndex: number): FaceMetric => ({
  captureDate,
  cheekWidthRatio: facialVolumeIndex / 100,
  jawWidthRatio: 0.5,
  facialVolumeIndex,
  engineVersion: "v1.0",
  computedAt: `${captureDate}T10:00:00.000Z`,
});

describe("buildFaceVolumeTrend", () => {
  it("is null with no measurements and primes on the first", () => {
    expect(buildFaceVolumeTrend([])).toBeNull();
    const first = buildFaceVolumeTrend([m("2026-05-01", 70)])!;
    expect(first.direction).toBe("holding");
    expect(first.line).toContain("First on-device measurement");
  });

  it("calls direction from first to latest, regardless of input order", () => {
    const thinner = buildFaceVolumeTrend([m("2026-06-01", 66), m("2026-05-01", 72)])!;
    expect(thinner.direction).toBe("thinner");
    expect(thinner.delta).toBe(-6);

    const fuller = buildFaceVolumeTrend([m("2026-05-01", 68), m("2026-06-01", 73)])!;
    expect(fuller.direction).toBe("fuller");

    const steady = buildFaceVolumeTrend([m("2026-05-01", 70), m("2026-06-01", 71)])!;
    expect(steady.direction).toBe("holding");
  });
});
