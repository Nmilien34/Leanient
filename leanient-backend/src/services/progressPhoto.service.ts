import { randomUUID } from "node:crypto";
import type {
  ProgressPhotoConfirmRequest,
  ProgressPhotoUploadIntentRequest,
} from "@leanient/shared";
import { progressPhotoUploadIntentRequestSchema } from "@leanient/shared";
import { env } from "../config/env";
import { NotFoundError } from "../lib/errors";
import { ProgressPhotoModel } from "../models/progressPhoto.model";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteS3Object,
  signedUrlExpiresAt,
} from "./s3.service";
import { serializeProgressPhoto } from "./serializers";

interface ObjectKeyInput {
  userId: string;
  uploadId: string;
  contentType: string;
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/heic") {
    return "heic";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function buildProgressPhotoObjectKey(input: ObjectKeyInput): string {
  return `users/${input.userId}/progress-photos/${input.uploadId}.${extensionForContentType(
    input.contentType,
  )}`;
}

export async function createProgressPhotoUploadIntent(
  userId: string,
  body: ProgressPhotoUploadIntentRequest,
) {
  const uploadIntent = progressPhotoUploadIntentRequestSchema.parse(body);
  const uploadId = randomUUID();
  const s3Key = buildProgressPhotoObjectKey({
    userId,
    uploadId,
    contentType: uploadIntent.contentType,
  });
  // Sign the failable external operation before persisting pending metadata,
  // so signing failures leave no orphaned ProgressPhoto records.
  const uploadUrl = await createPresignedPutUrl({
    key: s3Key,
    contentType: uploadIntent.contentType,
  });
  const photo = await ProgressPhotoModel.create({
    userId,
    captureDate: uploadIntent.captureDate,
    s3Key,
    contentType: uploadIntent.contentType,
    sizeBytes: uploadIntent.sizeBytes,
    status: "pending_upload",
    kind: uploadIntent.kind,
    faceFullness: uploadIntent.faceFullness,
  });

  return {
    photo: serializeProgressPhoto(photo),
    uploadUrl,
    expiresAt: signedUrlExpiresAt(),
  };
}

export async function confirmProgressPhotoUpload(
  userId: string,
  body: ProgressPhotoConfirmRequest,
) {
  const photo = await ProgressPhotoModel.findOneAndUpdate(
    {
      _id: body.photoId,
      userId,
    },
    {
      $set: {
        sizeBytes: body.sizeBytes,
        status: "uploaded",
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!photo) {
    throw new NotFoundError("Progress photo not found");
  }

  return serializeProgressPhoto(photo);
}

export async function listProgressPhotos(userId: string) {
  const photos = await ProgressPhotoModel.find({
    userId,
    status: "uploaded",
  }).sort({ captureDate: -1 });

  return Promise.all(
    photos.map(async (photo) => ({
      ...serializeProgressPhoto(photo),
      viewUrl: await createPresignedGetUrl({ key: photo.s3Key }),
    })),
  );
}

export async function getProgressPhotoViewUrl(userId: string, photoId: string) {
  const photo = await ProgressPhotoModel.findOne({
    _id: photoId,
    userId,
    status: "uploaded",
  });

  if (!photo) {
    throw new NotFoundError("Progress photo not found");
  }

  return {
    photo: serializeProgressPhoto(photo),
    viewUrl: await createPresignedGetUrl({ key: photo.s3Key }),
    expiresAt: signedUrlExpiresAt(),
  };
}

export async function deleteProgressPhoto(userId: string, photoId: string): Promise<void> {
  const photo = await ProgressPhotoModel.findOneAndUpdate(
    {
      _id: photoId,
      userId,
    },
    {
      $set: {
        status: "deleted",
      },
    },
    { new: true },
  );

  if (!photo) {
    throw new NotFoundError("Progress photo not found");
  }

  if (env.aws.bucketName) {
    await deleteS3Object(photo.s3Key);
  }
}
