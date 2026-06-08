import type { ProgressPhoto } from "@leanient/shared";
import { describe, expect, it } from "vitest";
import {
  buildProgressPhotoShareContent,
  getProgressPhotoOpenUrl,
  progressPhotoDisplayLabel,
} from "../../screens/app/progressPhotoDownload";

const photo: ProgressPhoto = {
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

describe("progressPhotoDownload", () => {
  it("formats date-only capture dates for gallery labels", () => {
    expect(progressPhotoDisplayLabel(photo)).toBe("Jun 8, 2026");
  });

  it("builds a share payload from a signed view URL", () => {
    expect(buildProgressPhotoShareContent(photo)).toEqual({
      title: "Leanient progress photo Jun 8, 2026",
      message: "Progress photo from Jun 8, 2026: https://signed.example.com/photo_1.jpg",
      url: "https://signed.example.com/photo_1.jpg",
    });
  });

  it("does not offer open/share actions before the backend provides a view URL", () => {
    const pendingPhoto = { ...photo, viewUrl: undefined };

    expect(getProgressPhotoOpenUrl(pendingPhoto)).toBeNull();
    expect(buildProgressPhotoShareContent(pendingPhoto)).toBeNull();
  });
});
