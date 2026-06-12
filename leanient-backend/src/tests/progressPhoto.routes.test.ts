import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

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
  let failSigning = false;

  return {
    S3Client: vi.fn((config) => ({ config })),
    PutObjectCommand: vi.fn((input) => ({ input })),
    GetObjectCommand: vi.fn((input) => ({ input })),
    DeleteObjectCommand: vi.fn((input) => ({ input })),
    getSignedUrl: vi.fn(async (_client, command: { input: { Key: string } }) => {
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
            const statusFilter = query.status as { $ne?: string } | string | undefined;
            const matchesStatus =
              typeof statusFilter === "string"
                ? photo.status === statusFilter
                : !statusFilter?.$ne || photo.status !== statusFilter.$ne;

            return photo.userId === query.userId && matchesStatus;
          })
          .sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1)),
      ),
    })),
    findOneAndUpdate: vi.fn(async (query, update) => {
      const photo = photos.find(
        (candidate) => candidate._id.toString() === query._id && candidate.userId === query.userId,
      );

      if (!photo) {
        return null;
      }

      Object.assign(photo, update.$set);
      photo.updatedAt = new Date("2026-06-01T12:05:00.000Z");
      return photo;
    }),
  };

  return {
    photos,
    ProgressPhotoModel,
    countForUser: (userId: string) => photos.filter((photo) => photo.userId === userId).length,
    reset: () => {
      nextId = 1;
      photos.splice(0, photos.length);
      ProgressPhotoModel.create.mockClear();
      ProgressPhotoModel.find.mockClear();
      ProgressPhotoModel.findOneAndUpdate.mockClear();
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

vi.mock("../models/progressPhoto.model", () => ({
  ProgressPhotoModel: modelMocks.ProgressPhotoModel,
}));

import { createApp } from "../server";

function makeUploadIntent() {
  return {
    captureDate: "2026-06-01",
    contentType: "image/jpeg",
    sizeBytes: 1_024,
  };
}

describe("progress photo routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    awsMocks.reset();
    modelMocks.reset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  async function createAndConfirmProgressPhoto(captureDate: string) {
    const intentResponse = await request(app)
      .post("/progress-photos/upload-intent")
      .set("Authorization", authorization)
      .send({ ...makeUploadIntent(), captureDate });
    const photoId = intentResponse.body.data.photo.id as string;

    await request(app)
      .post("/progress-photos/confirm")
      .set("Authorization", authorization)
      .send({ photoId, sizeBytes: 1_024 });
  }

  it("creates a pending photo record after generating an upload URL", async () => {
    const response = await request(app)
      .post("/progress-photos/upload-intent")
      .set("Authorization", authorization)
      .send(makeUploadIntent());

    expect(response.status).toBe(201);
    expect(response.body.data.uploadUrl).toContain("https://uploads.example.com/");
    expect(response.body.data.photo.id).toBe(modelMocks.photos[0]?._id.toString());
    expect(modelMocks.photos).toHaveLength(1);
    expect(modelMocks.photos[0]).toMatchObject({
      userId: "user_1",
      status: "pending_upload",
      captureDate: "2026-06-01",
      contentType: "image/jpeg",
    });
  });

  it("does not create a pending photo record when S3 signing fails", async () => {
    awsMocks.setFailSigning(true);
    const beforeCount = modelMocks.countForUser("user_1");

    const response = await request(app)
      .post("/progress-photos/upload-intent")
      .set("Authorization", authorization)
      .send(makeUploadIntent());

    const afterCount = modelMocks.countForUser("user_1");
    expect(response.status).toBe(500);
    expect(beforeCount).toBe(0);
    expect(afterCount).toBe(0);
    expect(modelMocks.ProgressPhotoModel.create).not.toHaveBeenCalled();
  });

  it("lists progress photos with signed view URLs", async () => {
    await createAndConfirmProgressPhoto("2026-06-01");
    await createAndConfirmProgressPhoto("2026-06-08");

    const response = await request(app).get("/progress-photos").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      captureDate: "2026-06-08",
      viewUrl: `https://uploads.example.com/${modelMocks.photos[1]?.s3Key}`,
    });
    expect(response.body.data[1]).toMatchObject({
      captureDate: "2026-06-01",
      viewUrl: `https://uploads.example.com/${modelMocks.photos[0]?.s3Key}`,
    });
  });

  it("does not list progress photos until the upload is confirmed", async () => {
    await request(app)
      .post("/progress-photos/upload-intent")
      .set("Authorization", authorization)
      .send({ ...makeUploadIntent(), captureDate: "2026-06-01" });
    await createAndConfirmProgressPhoto("2026-06-08");

    const response = await request(app).get("/progress-photos").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      captureDate: "2026-06-08",
      status: "uploaded",
    });
  });

  it("returns an empty progress photo list for users with no photos", async () => {
    const response = await request(app).get("/progress-photos").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
