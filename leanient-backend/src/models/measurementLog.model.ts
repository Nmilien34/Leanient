import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { BodyMeasurements, MeasurementUnit } from "@leanient/shared";

export interface MeasurementLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  measurements: BodyMeasurements;
  unit: MeasurementUnit;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bodyMeasurementsSchema = new Schema<BodyMeasurements>(
  {
    waist: { type: Number, min: 0 },
    arm: { type: Number, min: 0 },
    thigh: { type: Number, min: 0 },
    hip: { type: Number, min: 0 },
    chest: { type: Number, min: 0 },
    neck: { type: Number, min: 0 },
    forearm: { type: Number, min: 0 },
    calf: { type: Number, min: 0 },
  },
  {
    _id: false,
  },
);

const measurementLogSchema = new Schema<MeasurementLogDocument>(
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
    measurements: {
      type: bodyMeasurementsSchema,
      required: true,
    },
    unit: {
      type: String,
      enum: ["in", "cm"],
      required: true,
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

measurementLogSchema.index({ userId: 1, recordedAt: -1 });
measurementLogSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const MeasurementLogModel = mongoose.model<MeasurementLogDocument>(
  "MeasurementLog",
  measurementLogSchema,
);
