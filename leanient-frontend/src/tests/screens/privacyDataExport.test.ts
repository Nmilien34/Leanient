import type { ProgressPhoto, WeightLog } from "@leanient/shared";
import { describe, expect, it } from "vitest";
import {
  buildPrivacyDataExportPayload,
  buildPrivacyDataExportShareContent,
} from "../../screens/app/privacyDataExport";

const weightLog: WeightLog = {
  id: "weight_1",
  userId: "user_1",
  weight: 190,
  unit: "lb",
  recordedAt: "2026-06-08T12:00:00.000Z",
  notes: "Morning",
  createdAt: "2026-06-08T12:00:00.000Z",
  updatedAt: "2026-06-08T12:00:00.000Z",
};

const progressPhoto: ProgressPhoto = {
  id: "photo_1",
  userId: "user_1",
  captureDate: "2026-06-08",
  s3Key: "progress/user_1/photo_1.jpg",
  contentType: "image/jpeg",
  status: "uploaded",
  viewUrl: "https://signed.example.com/photo_1.jpg",
  createdAt: "2026-06-08T12:00:00.000Z",
  updatedAt: "2026-06-08T12:00:00.000Z",
};

describe("privacyDataExport", () => {
  it("builds a stable export payload from loaded Leanient data", () => {
    const payload = buildPrivacyDataExportPayload(
      {
        profile: null,
        medicationProtocol: null,
        latestVerdictStatus: "still_gathering",
        latestVerdictMessage: "Keep logging this week.",
        latestVerdict: null,
        weightLogs: [weightLog],
        recentDoseLogs: [],
        todaysMeals: [],
        todaysWorkouts: [],
        progressOverview: null,
        trainingToday: null,
        progressPhotos: [progressPhoto],
      },
      new Date("2026-06-08T15:30:00.000Z"),
    );

    expect(payload.exportedAt).toBe("2026-06-08T15:30:00.000Z");
    expect(payload.logs.weightLogs).toEqual([weightLog]);
    expect(payload.progress.photos).toEqual([
      {
        id: "photo_1",
        captureDate: "2026-06-08",
        contentType: "image/jpeg",
        sizeBytes: undefined,
        status: "uploaded",
        createdAt: "2026-06-08T12:00:00.000Z",
        updatedAt: "2026-06-08T12:00:00.000Z",
      },
    ]);
  });

  it("turns the export payload into shareable JSON", () => {
    const payload = buildPrivacyDataExportPayload(
      {
        profile: null,
        medicationProtocol: null,
        latestVerdictStatus: null,
        latestVerdictMessage: null,
        latestVerdict: null,
        weightLogs: [],
        recentDoseLogs: [],
        todaysMeals: [],
        todaysWorkouts: [],
        progressOverview: null,
        trainingToday: null,
        progressPhotos: [],
      },
      new Date("2026-06-08T15:30:00.000Z"),
    );

    const share = buildPrivacyDataExportShareContent(payload);

    expect(share.title).toBe("Leanient data export");
    expect(JSON.parse(share.message).exportedAt).toBe("2026-06-08T15:30:00.000Z");
  });
});
