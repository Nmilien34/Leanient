import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { ProgressPhotoKind, ProgressPhotoStatus } from "@leanient/shared";

export interface ProgressPhotoDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  captureDate: string;
  s3Key: string;
  contentType: string;
  sizeBytes?: number;
  status: ProgressPhotoStatus;
  kind: ProgressPhotoKind;
  faceFullness?: number;
  createdAt: Date;
  updatedAt: Date;
}

const progressPhotoSchema = new Schema<ProgressPhotoDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    captureDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending_upload", "uploaded", "deleted"],
      default: "pending_upload",
      index: true,
    },
    kind: {
      type: String,
      enum: ["body", "face"],
      default: "body",
      index: true,
    },
    faceFullness: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

progressPhotoSchema.index({ userId: 1, captureDate: -1 });

export const ProgressPhotoModel = mongoose.model<ProgressPhotoDocument>(
  "ProgressPhoto",
  progressPhotoSchema,
);
