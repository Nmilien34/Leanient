import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { WeightUnit } from "@leanient/shared";

export interface WeightLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  weekOf?: string;
  value: number;
  unit: WeightUnit;
  measuredAt: Date;
  source: "onboarding" | "weekly_checkin" | "manual";
  weeklyCheckinId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weightLogSchema = new Schema<WeightLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekOf: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      enum: ["lb", "kg"],
      required: true,
    },
    measuredAt: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["onboarding", "weekly_checkin", "manual"],
      required: true,
    },
    weeklyCheckinId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyCheckin",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

weightLogSchema.index({ userId: 1, measuredAt: -1 });
weightLogSchema.index(
  { userId: 1, weekOf: 1 },
  {
    unique: true,
    partialFilterExpression: {
      weekOf: { $exists: true },
    },
  },
);

export const WeightLogModel = mongoose.model<WeightLogDocument>("WeightLog", weightLogSchema);
