import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProgressPhotoService } from "../../services/progressPhoto.service";

describe("progress photo service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an upload intent, uploads bytes to the signed URL, then confirms", async () => {
    const createUploadIntent = vi.fn().mockResolvedValue({
      photo: {
        id: "photo_1",
        userId: "user_1",
        captureDate: "2026-05-29",
        s3Key: "users/user_1/progress-photos/photo_1.jpg",
        contentType: "image/jpeg",
        status: "pending_upload",
        createdAt: "2026-05-29T12:00:00.000Z",
        updatedAt: "2026-05-29T12:00:00.000Z",
      },
      uploadUrl: "https://s3.example/upload",
      expiresAt: "2026-05-29T12:10:00.000Z",
    });
    const confirmProgressPhotoUpload = vi.fn().mockResolvedValue({ id: "photo_1" });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const service = createProgressPhotoService({
      api: {
        createProgressPhotoUploadIntent: createUploadIntent,
        confirmProgressPhotoUpload,
      },
      fetchImpl,
    });

    const result = await service.uploadProgressPhoto({
      captureDate: "2026-05-29",
      contentType: "image/jpeg",
      bytes: new Uint8Array([1, 2, 3]),
      sizeBytes: 3,
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://s3.example/upload", {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: expect.any(Uint8Array),
    });
    expect(confirmProgressPhotoUpload).toHaveBeenCalledWith({ photoId: "photo_1", sizeBytes: 3 });
    expect(result).toEqual({ id: "photo_1" });
  });
});
