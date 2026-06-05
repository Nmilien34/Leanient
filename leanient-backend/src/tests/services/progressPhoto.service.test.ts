import type { ProgressPhotoUploadIntentRequest } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockObjectId {
  toString: () => string;
}

interface MockProgressPhotoDocument {
  _id: MockObjectId;
  userId: string;
  captureDate: string;
  s3Key: string;
  contentType: string;
  sizeBytes?: number;
  status: "pending_upload" | "uploaded" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

const awsMocks = vi.hoisted(() => {
  const operationOrder: string[] = [];
  let failSigning = false;

  return {
    operationOrder,
    S3Client: vi.fn((config) => ({ config })),
    PutObjectCommand: vi.fn((input) => ({ input })),
    GetObjectCommand: vi.fn((input) => ({ input })),
    DeleteObjectCommand: vi.fn((input) => ({ input })),
    getSignedUrl: vi.fn(async (_client, command: { input: { Key: string } }) => {
      operationOrder.push("sign");

      if (failSigning) {
        throw new Error("S3 signing failed");
      }

      return `https://uploads.example.com/${command.input.Key}`;
    }),
    setFailSigning: (value: boolean) => {
      failSigning = value;
    },
    reset: () => {
      failSigning = false;
      operationOrder.splice(0, operationOrder.length);
      awsMocks.S3Client.mockClear();
      awsMocks.PutObjectCommand.mockClear();
      awsMocks.GetObjectCommand.mockClear();
      awsMocks.DeleteObjectCommand.mockClear();
      awsMocks.getSignedUrl.mockClear();
    },
  };
});

const modelMocks = vi.hoisted(() => {
  let nextId = 1;
  const photos: MockProgressPhotoDocument[] = [];
  const operationOrder: string[] = awsMocks.operationOrder;

  function objectId(prefix: string): MockObjectId {
    const id = `${prefix}_${nextId}`;
    nextId += 1;
    return {
      toString: () => id,
    };
  }

  function timestamps() {
    const now = new Date("2026-06-01T12:00:00.000Z");
    return {
      createdAt: now,
      updatedAt: now,
    };
  }

  const ProgressPhotoModel = {
    create: vi.fn(async (data) => {
      operationOrder.push("create");
      const photo = {
        _id: data._id ?? objectId("photo"),
        userId: data.userId,
        captureDate: data.captureDate,
        s3Key: data.s3Key,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        status: data.status,
        ...timestamps(),
      };
      photos.push(photo);
      return photo;
    }),
    find: vi.fn((query) => ({
      sort: vi.fn(async () =>
        photos
          .filter((photo) => {
            const statusFilter = query.status as { $ne?: string } | undefined;
            return photo.userId === query.userId && (!statusFilter?.$ne || photo.status !== statusFilter.$ne);
          })
          .sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1)),
      ),
    })),
  };

  return {
    photos,
    ProgressPhotoModel,
    reset: () => {
      nextId = 1;
      photos.splice(0, photos.length);
      ProgressPhotoModel.create.mockClear();
      ProgressPhotoModel.find.mockClear();
    },
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: awsMocks.S3Client,
  PutObjectCommand: awsMocks.PutObjectCommand,
  GetObjectCommand: awsMocks.GetObjectCommand,
  DeleteObjectCommand: awsMocks.DeleteObjectCommand,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: awsMocks.getSignedUrl,
}));

vi.mock("../../models/progressPhoto.model", () => ({
  ProgressPhotoModel: modelMocks.ProgressPhotoModel,
}));

import {
  buildProgressPhotoObjectKey,
  createProgressPhotoUploadIntent,
  listProgressPhotos,
} from "../../services/progressPhoto.service";

function makeUploadIntent(
  overrides: Partial<ProgressPhotoUploadIntentRequest> = {},
): ProgressPhotoUploadIntentRequest {
  return {
    captureDate: overrides.captureDate ?? "2026-06-01",
    contentType: overrides.contentType ?? "image/jpeg",
    sizeBytes: overrides.sizeBytes ?? 1_024,
  };
}

describe("progress photo service", () => {
  beforeEach(() => {
    awsMocks.reset();
    modelMocks.reset();
  });

  it("builds private user-scoped S3 object keys", () => {
    expect(
      buildProgressPhotoObjectKey({
        userId: "user_123",
        uploadId: "upload_456",
        contentType: "image/jpeg",
      }),
    ).toBe("users/user_123/progress-photos/upload_456.jpg");
  });

  it("keeps file extensions aligned with mobile image content types", () => {
    expect(
      buildProgressPhotoObjectKey({
        userId: "user_123",
        uploadId: "photo_png",
        contentType: "image/png",
      }),
    ).toBe("users/user_123/progress-photos/photo_png.png");

    expect(
      buildProgressPhotoObjectKey({
        userId: "user_123",
        uploadId: "photo_heic",
        contentType: "image/heic",
      }),
    ).toBe("users/user_123/progress-photos/photo_heic.heic");

    expect(
      buildProgressPhotoObjectKey({
        userId: "user_123",
        uploadId: "photo_webp",
        contentType: "image/webp",
      }),
    ).toBe("users/user_123/progress-photos/photo_webp.webp");
  });

  it("signs the S3 upload URL before creating the pending photo record", async () => {
    const result = await createProgressPhotoUploadIntent("user_1", makeUploadIntent());

    expect(awsMocks.operationOrder).toEqual(["sign", "create"]);
    expect(awsMocks.getSignedUrl).toHaveBeenCalledTimes(1);
    expect(modelMocks.ProgressPhotoModel.create).toHaveBeenCalledTimes(1);
    expect(modelMocks.photos).toHaveLength(1);
    expect(result.uploadUrl).toBe(`https://uploads.example.com/${modelMocks.photos[0]?.s3Key}`);
    expect(result.photo.id).toBe(modelMocks.photos[0]?._id.toString());
  });

  it("does not create a Mongo record when S3 signing fails", async () => {
    awsMocks.setFailSigning(true);

    await expect(createProgressPhotoUploadIntent("user_1", makeUploadIntent())).rejects.toThrow(
      "S3 signing failed",
    );

    expect(modelMocks.photos).toHaveLength(0);
    expect(modelMocks.ProgressPhotoModel.create).not.toHaveBeenCalled();
  });

  it("does not sign or write when upload intent validation fails", async () => {
    const invalidBody = {
      captureDate: "June 1",
      contentType: "image/gif",
      sizeBytes: -1,
    } as unknown as ProgressPhotoUploadIntentRequest;

    await expect(createProgressPhotoUploadIntent("user_1", invalidBody)).rejects.toThrow();

    expect(awsMocks.getSignedUrl).not.toHaveBeenCalled();
    expect(modelMocks.ProgressPhotoModel.create).not.toHaveBeenCalled();
    expect(modelMocks.photos).toHaveLength(0);
  });

  it("creates separate records and keys for separate upload intents", async () => {
    await createProgressPhotoUploadIntent("user_1", makeUploadIntent());
    await createProgressPhotoUploadIntent("user_1", makeUploadIntent());

    expect(modelMocks.photos).toHaveLength(2);
    expect(new Set(modelMocks.photos.map((photo) => photo.s3Key)).size).toBe(2);
  });

  it("returns signed view URLs for each listed progress photo", async () => {
    await createProgressPhotoUploadIntent("user_1", makeUploadIntent({ captureDate: "2026-06-01" }));
    await createProgressPhotoUploadIntent("user_1", makeUploadIntent({ captureDate: "2026-06-08" }));

    const photos = await listProgressPhotos("user_1");

    expect(photos).toHaveLength(2);
    expect(photos.map((photo) => photo.viewUrl)).toEqual([
      `https://uploads.example.com/${modelMocks.photos[1]?.s3Key}`,
      `https://uploads.example.com/${modelMocks.photos[0]?.s3Key}`,
    ]);
    expect(awsMocks.getSignedUrl).toHaveBeenCalledTimes(4);
  });

  it("returns an empty list without signing when the user has no progress photos", async () => {
    const photos = await listProgressPhotos("user_1");

    expect(photos).toEqual([]);
    expect(awsMocks.getSignedUrl).not.toHaveBeenCalled();
  });
});
