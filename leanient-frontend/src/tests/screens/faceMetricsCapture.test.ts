import { describe, expect, it, vi } from "vitest";
import type { FaceLandmarks, FaceMetric } from "../../screens/app/faceMetrics";
import { clearFaceMetrics, loadFaceMetrics, saveFaceMetric, type KeyValueStore } from "../../screens/app/faceMetricsStore";
import { runFaceMetricCapture } from "../../screens/app/faceMetricsCapture";

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
    removeItem: async (k) => void map.delete(k),
  };
}

function landmarks(): FaceLandmarks {
  const contour = [];
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const y = 0.1 + t * 0.8;
    const halfW = ((t < 0.5 ? 0.7 : 0.55) * 0.8) / 2;
    contour.push({ x: 0.5 - halfW, y }, { x: 0.5 + halfW, y });
  }
  return { contour, boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 } };
}

const metric = (captureDate: string, index: number): FaceMetric => ({
  captureDate,
  cheekWidthRatio: index / 100,
  jawWidthRatio: 0.5,
  facialVolumeIndex: index,
  engineVersion: "v1.0",
  computedAt: `${captureDate}T10:00:00.000Z`,
});

describe("faceMetricsStore", () => {
  it("saves, dedupes by capture date, and sorts ascending", async () => {
    const store = memoryStore();
    await saveFaceMetric("u1", metric("2026-06-01", 70), store);
    await saveFaceMetric("u1", metric("2026-05-18", 72), store);
    await saveFaceMetric("u1", metric("2026-06-01", 68), store); // same day replaces

    const all = await loadFaceMetrics("u1", store);
    expect(all.map((m) => m.captureDate)).toEqual(["2026-05-18", "2026-06-01"]);
    expect(all[1].facialVolumeIndex).toBe(68);
  });

  it("scopes metrics per user and clears on request", async () => {
    const store = memoryStore();
    await saveFaceMetric("u1", metric("2026-06-01", 70), store);
    await saveFaceMetric("u2", metric("2026-06-01", 60), store);
    expect(await loadFaceMetrics("u2", store)).toHaveLength(1);

    await clearFaceMetrics("u1", store);
    expect(await loadFaceMetrics("u1", store)).toEqual([]);
    expect(await loadFaceMetrics("u2", store)).toHaveLength(1);
  });

  it("returns empty for missing or corrupt data", async () => {
    const store = memoryStore();
    expect(await loadFaceMetrics("nobody", store)).toEqual([]);
    await store.setItem("leanient.faceMetrics.u1", "{not json");
    expect(await loadFaceMetrics("u1", store)).toEqual([]);
  });
});

describe("runFaceMetricCapture", () => {
  const base = {
    userId: "u1",
    uri: "file://shot.jpg",
    captureDate: "2026-06-12",
    computedAt: "2026-06-12T10:00:00.000Z",
  };

  it("skips entirely without consent (no detection, no persist)", async () => {
    const detect = vi.fn(async () => landmarks());
    const persist = vi.fn(async () => undefined);
    const result = await runFaceMetricCapture({ ...base, consentGranted: false, detect, persist });
    expect(result).toBeNull();
    expect(detect).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("detects, computes, and persists a metric when consented", async () => {
    const store = memoryStore();
    const result = await runFaceMetricCapture({
      ...base,
      consentGranted: true,
      detect: async () => landmarks(),
      persist: (userId, m) => saveFaceMetric(userId, m, store),
    });
    expect(result?.facialVolumeIndex).toBe(70);
    expect(await loadFaceMetrics("u1", store)).toHaveLength(1);
  });

  it("falls back to null when no face is detected", async () => {
    const persist = vi.fn(async () => undefined);
    const result = await runFaceMetricCapture({ ...base, consentGranted: true, detect: async () => null, persist });
    expect(result).toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });

  it("never throws when detection or persistence fails", async () => {
    const detectThrows = await runFaceMetricCapture({
      ...base,
      consentGranted: true,
      detect: async () => {
        throw new Error("native crash");
      },
      persist: async () => undefined,
    });
    expect(detectThrows).toBeNull();

    const persistThrows = await runFaceMetricCapture({
      ...base,
      consentGranted: true,
      detect: async () => landmarks(),
      persist: async () => {
        throw new Error("disk full");
      },
    });
    expect(persistThrows).toBeNull();
  });
});
