import { beforeEach, describe, expect, it, vi } from "vitest";

const imagePickerMock = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));

vi.mock("expo-image-picker", () => imagePickerMock);

import {
  createProgressPhotoService,
  detectProgressPhotoContentType,
  pickProgressPhotoFromLibrary,
} from "../../services/progressPhoto.service";

describe("progress photo service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockReset();
    imagePickerMock.launchImageLibraryAsync.mockReset();
  });

  it("detects progress photo content type from MIME type or URI extension", () => {
    expect(detectProgressPhotoContentType("image/png", "file:///tmp/body.jpg")).toBe("image/png");
    expect(detectProgressPhotoContentType(undefined, "file:///tmp/body.webp?cache=1")).toBe("image/webp");
    expect(detectProgressPhotoContentType("image/heic", "file:///tmp/body")).toBe("image/heic");
    expect(detectProgressPhotoContentType(undefined, "file:///tmp/body")).toBe("image/jpeg");
  });

  it("picks a progress photo from the phone library", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    imagePickerMock.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///tmp/progress.png", mimeType: "image/png" }],
    });

    await expect(pickProgressPhotoFromLibrary()).resolves.toEqual({
      uri: "file:///tmp/progress.png",
      contentType: "image/png",
    });

    expect(imagePickerMock.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      }),
    );
  });

  it("returns null when library picking is cancelled", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    imagePickerMock.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    await expect(pickProgressPhotoFromLibrary()).resolves.toBeNull();
  });

  it("throws a friendly error when photo library permission is denied", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });

    await expect(pickProgressPhotoFromLibrary()).rejects.toThrow(
      "Photo access is needed to choose a progress photo. Enable it in Settings.",
    );
    expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();
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
