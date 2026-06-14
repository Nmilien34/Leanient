import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FaceMetric } from "./faceMetrics";

/**
 * On-device store for facial-volume metrics. They live ONLY on the device
 * (AsyncStorage), never the server, which is what the consent screen promises.
 * The store is keyed per user and injectable so it can be unit-tested.
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const keyFor = (userId: string): string => `leanient.faceMetrics.${userId}`;
const byCaptureDate = (a: FaceMetric, b: FaceMetric): number => a.captureDate.localeCompare(b.captureDate);

export async function loadFaceMetrics(
  userId: string,
  store: KeyValueStore = AsyncStorage,
): Promise<FaceMetric[]> {
  const raw = await store.getItem(keyFor(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FaceMetric[];
    return Array.isArray(parsed) ? [...parsed].sort(byCaptureDate) : [];
  } catch {
    return [];
  }
}

export async function saveFaceMetric(
  userId: string,
  metric: FaceMetric,
  store: KeyValueStore = AsyncStorage,
): Promise<FaceMetric[]> {
  const existing = await loadFaceMetrics(userId, store);
  // One metric per capture date; a re-taken check replaces that day's reading.
  const next = [...existing.filter((m) => m.captureDate !== metric.captureDate), metric].sort(byCaptureDate);
  await store.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

/** Wipe all stored metrics for a user (called when consent is revoked). */
export async function clearFaceMetrics(
  userId: string,
  store: KeyValueStore = AsyncStorage,
): Promise<void> {
  await store.removeItem(keyFor(userId));
}
