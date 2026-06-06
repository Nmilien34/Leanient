import { randomUUID } from "node:crypto";
import type {
  AvatarConfirmRequest,
  AvatarUploadIntentRequest,
  AvatarUploadIntentResponse,
  AvatarViewUrlResponse,
  User as SharedUser,
} from "@leanient/shared";
import { env } from "../config/env";
import { NotFoundError, ValidationError } from "../lib/errors";
import { UserModel } from "../models/user.model";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteS3Object,
  signedUrlExpiresAt,
} from "./s3.service";
import { serializeUser } from "./user.service";

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/heic") return "heic";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function avatarKeyPrefix(userId: string): string {
  return `users/${userId}/avatar/`;
}

export function buildAvatarObjectKey(input: {
  userId: string;
  uploadId: string;
  contentType: string;
}): string {
  return `${avatarKeyPrefix(input.userId)}${input.uploadId}.${extensionForContentType(
    input.contentType,
  )}`;
}

/**
 * Issue a presigned PUT URL the client uses to upload its avatar bytes directly
 * to S3. Nothing is persisted yet — confirmAvatarUpload saves the key once the
 * upload succeeds, mirroring the progress-photo flow.
 */
export async function createAvatarUploadIntent(
  userId: string,
  body: AvatarUploadIntentRequest,
): Promise<AvatarUploadIntentResponse> {
  const key = buildAvatarObjectKey({
    userId,
    uploadId: randomUUID(),
    contentType: body.contentType,
  });
  const uploadUrl = await createPresignedPutUrl({ key, contentType: body.contentType });

  return { uploadUrl, key, expiresAt: signedUrlExpiresAt() };
}

/**
 * Persist the uploaded avatar key on the user and best-effort delete the prior
 * avatar object. The key must live under the caller's own avatar prefix so a
 * client cannot point its avatar at another user's (or arbitrary) object.
 */
export async function confirmAvatarUpload(
  userId: string,
  body: AvatarConfirmRequest,
): Promise<SharedUser> {
  if (!body.key.startsWith(avatarKeyPrefix(userId))) {
    throw new ValidationError("Avatar key does not belong to this user");
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const previousKey = user.avatarKey;
  user.avatarKey = body.key;
  await user.save();

  if (previousKey && previousKey !== body.key && env.aws.bucketName) {
    // Old object is now orphaned; remove it. Failure here is non-fatal.
    await deleteS3Object(previousKey).catch(() => {});
  }

  return serializeUser(user);
}

/** Fresh presigned GET URL for the user's uploaded avatar, or nulls if none. */
export async function getAvatarViewUrl(userId: string): Promise<AvatarViewUrlResponse> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.avatarKey) {
    return { viewUrl: null, expiresAt: null };
  }

  return {
    viewUrl: await createPresignedGetUrl({ key: user.avatarKey }),
    expiresAt: signedUrlExpiresAt(),
  };
}
