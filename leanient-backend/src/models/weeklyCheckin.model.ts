import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { UserContextSnapshot, WeightMeasurement } from "@leanient/shared";

export interface WeeklyCheckinDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  weekOf: string;
  weight: WeightMeasurement;
  proteinGramsPerDay: number;
  resistanceWorkoutsCompleted: number;
  sideEffects: string[];
  notes?: string;
  userContextSnapshot: UserContextSnapshot;
  weightLogId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyCheckinSchema = new Schema<WeeklyCheckinDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekOf: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    weight: {
      value: { type: Number, required: true, min: 1 },
      unit: { type: String, enum: ["lb", "kg"], required: true },
      measuredAt: { type: String, required: true },
    },
    proteinGramsPerDay: {
      type: Number,
      required: true,
      min: 0,
      max: 400,
    },
    resistanceWorkoutsCompleted: {
      type: Number,
      required: true,
      min: 0,
      max: 14,
    },
    sideEffects: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    userContextSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    weightLogId: {
      type: Schema.Types.ObjectId,
      ref: "WeightLog",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

weeklyCheckinSchema.index({ userId: 1, weekOf: 1 }, { unique: true });

export const WeeklyCheckinModel = mongoose.model<WeeklyCheckinDocument>(
  "WeeklyCheckin",
  weeklyCheckinSchema,
);
