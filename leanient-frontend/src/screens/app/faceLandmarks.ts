import { requireOptionalNativeModule } from "expo-modules-core";
import type { FaceLandmarks } from "./faceMetrics";

/**
 * Thin bridge to the on-device face-landmark detector (the native Apple Vision
 * module under modules/leanient-face-landmarks). It is OPTIONAL: in Expo Go, the
 * web preview, or any build without the native module, this resolves to null and
 * the app degrades to the self-rated fullness. Keeping this wrapper tiny means
 * the only unverifiable surface is the native Swift itself; all geometry and
 * orchestration live in plain, tested TypeScript.
 */

interface FaceLandmarksNativeModule {
  /** Detect the most prominent face in the image and return normalized geometry. */
  detectFromImage(uri: string): Promise<FaceLandmarks | null>;
}

const nativeModule = requireOptionalNativeModule<FaceLandmarksNativeModule>("LeanientFaceLandmarks");

/** True only in a build that bundles the native detector. */
export function isFaceDetectionAvailable(): boolean {
  return nativeModule != null;
}

/** Run on-device detection, or null when unavailable / no face / failure. */
export async function detectFaceLandmarks(uri: string): Promise<FaceLandmarks | null> {
  if (!nativeModule) return null;
  try {
    return await nativeModule.detectFromImage(uri);
  } catch {
    return null;
  }
}
