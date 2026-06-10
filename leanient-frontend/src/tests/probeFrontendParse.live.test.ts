/**
 * LIVE diagnostic harness, not a CI test: runs the REAL LeanientApiClient
 * (actual Zod schemas + transforms) against a freshly-onboarded user on a
 * local backend, replicating refreshHomeData()'s 11 calls to find which one
 * rejects client-side right after onboarding.
 *
 * Skipped unless PROBE_TOKEN is set:
 *   PROBE_TOKEN=... npx vitest run src/tests/probeFrontendParse.live.test.ts
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../services/storage.service", () => ({
  getStoredAuthToken: async () => process.env.PROBE_TOKEN ?? null,
  getStoredUser: async () => null,
  setStoredAuth: async () => undefined,
  setStoredUser: async () => undefined,
  clearAuthStorage: async () => undefined,
}));

const TOKEN = process.env.PROBE_TOKEN;

describe.skipIf(!TOKEN)("live frontend parse probe", () => {
  it("runs every refreshHomeData call through the real client", async () => {
    const { LeanientApiClient } = await import("../services/api.service");
    const api = new LeanientApiClient({ baseURL: process.env.PROBE_BASE_URL ?? "http://localhost:8080" });
    const today = new Date().toISOString();

    const calls: Array<[string, () => Promise<unknown>]> = [
      ["getProfile", () => api.getProfile()],
      ["getMedicationProtocol", () => api.getMedicationProtocol()],
      ["getWeightLogs", () => api.getWeightLogs()],
      ["getLatestWeeklyVerdict", () => api.getLatestWeeklyVerdict()],
      ["getRecommendedWorkouts", () => api.getRecommendedWorkouts()],
      ["getTodaysFocus", () => api.getTodaysFocus()],
      ["getMealLogs(today)", () => api.getMealLogs({ recordedAt: today })],
      ["getWorkoutLogs(today)", () => api.getWorkoutLogs({ recordedAt: today })],
      ["getDoseLogs", () => api.getDoseLogs()],
      ["getProgressOverview", () => api.getProgressOverview()],
      ["getTrainingToday", () => api.getTrainingToday()],
    ];

    const results = await Promise.allSettled(calls.map(([, fn]) => fn()));
    const failures: string[] = [];
    results.forEach((result, i) => {
      const name = calls[i][0];
      if (result.status === "rejected") {
        const reason = result.reason as { message?: string; issues?: unknown };
        failures.push(name);
        console.log(`FAIL ${name}: ${reason?.message ?? String(result.reason)}`);
        if (reason?.issues) console.log(JSON.stringify(reason.issues, null, 2).slice(0, 1500));
      } else {
        console.log(` ok  ${name}`);
      }
    });

    expect(failures).toEqual([]);
  }, 30000);
});
