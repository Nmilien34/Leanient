import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { SideEffectSymptom } from "@leanient/shared";

export interface SideEffectLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  symptom: SideEffectSymptom;
  customSymptom?: string;
  severity: number;
  durationHours?: number;
  relatedToDose?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sideEffectLogSchema = new Schema<SideEffectLogDocument>(
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
    symptom: {
      type: String,
      enum: [
        "nausea",
        "fatigue",
        "gi",
        "headache",
        "reflux",
        "dizziness",
        "appetite_loss",
        "other",
      ],
      required: true,
    },
    customSymptom: {
      type: String,
      trim: true,
    },
    severity: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    durationHours: {
      type: Number,
      min: 0,
    },
    relatedToDose: {
      type: Boolean,
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

sideEffectLogSchema.index({ userId: 1, recordedAt: -1 });
sideEffectLogSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

export const SideEffectLogModel = mongoose.model<SideEffectLogDocument>(
  "SideEffectLog",
  sideEffectLogSchema,
);
