import { computeFaceMetrics, type FaceLandmarks, type FaceMetric } from "./faceMetrics";

/**
 * Orchestrates a single on-device facial measurement after a face check:
 * gate on consent, detect landmarks, compute the metric, persist locally. Every
 * dependency is injected, so this is fully testable and never imports native
 * code. It never throws (a failed measurement just yields null and the app falls
 * back to the self-rated fullness).
 */
export async function runFaceMetricCapture(args: {
  userId: string;
  uri: string;
  captureDate: string;
  computedAt: string;
  consentGranted: boolean;
  detect: (uri: string) => Promise<FaceLandmarks | null>;
  persist: (userId: string, metric: FaceMetric) => Promise<unknown>;
}): Promise<FaceMetric | null> {
  if (!args.consentGranted) return null;

  let landmarks: FaceLandmarks | null = null;
  try {
    landmarks = await args.detect(args.uri);
  } catch {
    return null;
  }
  if (!landmarks) return null;

  const metric = computeFaceMetrics(landmarks, {
    captureDate: args.captureDate,
    computedAt: args.computedAt,
  });
  if (!metric) return null;

  try {
    await args.persist(args.userId, metric);
  } catch {
    return null;
  }

  return metric;
}
