import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { MealScanAnalysis, MealScanCoachContent, MealScanImageMimeType } from "@leanient/shared";

export interface MealScanDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  photoS3Key: string;
  imageMimeType: MealScanImageMimeType;
  analysis: MealScanAnalysis | null;
  coachContent: MealScanCoachContent | null;
  idempotencyKey?: string;
  visionEngineVersion: string;
  coachContentVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const mealScanAnalysisSchema = new Schema<MealScanAnalysis>(
  {
    foodName: { type: String, required: true, trim: true },
    servingSize: { type: String, required: true, trim: true },
    protein: { type: Number, required: true, min: 0 },
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false, versionKey: false },
);

const mealScanAdjustedMacrosSchema = new Schema(
  {
    protein: { type: Number, required: true, min: 0 },
    calories: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);

const mealScanSwapSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    additionalProtein: { type: Number, required: true, min: 0 },
    additionalCalories: { type: Number, required: true, min: 0 },
    adjustedMacros: { type: mealScanAdjustedMacrosSchema, required: true },
  },
  { _id: false, versionKey: false },
);

const mealScanCoachContentSchema = new Schema<MealScanCoachContent>(
  {
    mode: { type: String, enum: ["affirmation", "swap"], required: true },
    callout: { type: String, required: true, trim: true },
    swap: { type: mealScanSwapSchema, default: null },
    copyVersion: { type: String, required: true, trim: true },
  },
  { _id: false, versionKey: false },
);

const mealScanSchema = new Schema<MealScanDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    photoS3Key: {
      type: String,
      required: true,
      trim: true,
    },
    imageMimeType: {
      type: String,
      enum: ["image/jpeg", "image/png"],
      required: true,
    },
    analysis: {
      type: mealScanAnalysisSchema,
      default: null,
    },
    coachContent: {
      type: mealScanCoachContentSchema,
      default: null,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    visionEngineVersion: {
      type: String,
      required: true,
      trim: true,
    },
    coachContentVersion: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

mealScanSchema.index({ userId: 1, createdAt: -1 });
mealScanSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const MealScanModel = mongoose.model<MealScanDocument>("MealScan", mealScanSchema);
