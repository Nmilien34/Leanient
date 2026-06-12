import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { MealLogSource } from "@leanient/shared";

export interface MealLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  source: MealLogSource;
  photoS3Key?: string;
  aiScanConfidence?: number;
  foodName: string;
  servingSize?: string;
  protein: number;
  calories: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  waterOz?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const mealLogSchema = new Schema<MealLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["photo_scan", "manual", "barcode"],
      required: true,
    },
    photoS3Key: {
      type: String,
      trim: true,
    },
    aiScanConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
    },
    servingSize: {
      type: String,
      trim: true,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      min: 0,
    },
    fat: {
      type: Number,
      min: 0,
    },
    fiber: {
      type: Number,
      min: 0,
    },
    waterOz: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

mealLogSchema.index({ userId: 1, recordedAt: -1 });
mealLogSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

export const MealLogModel = mongoose.model<MealLogDocument>("MealLog", mealLogSchema);
