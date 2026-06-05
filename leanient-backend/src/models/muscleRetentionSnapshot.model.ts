import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { VerdictInputDataSource } from "@leanient/shared";
import type { MuscleRetentionLabel } from "../lib/muscleRetention";

export interface MuscleRetentionSnapshotDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  weekOf: Date;
  proteinScore: number;
  trainingScore: number;
  paceScore: number;
  muscleRetentionScore: number;
  retentionLabel: MuscleRetentionLabel;
  weeklyWeightLossLb: number;
  cumulativeWeightLossLb: number;
  inputsUsed: {
    avgDailyProteinGrams: number;
    sessionsCompleted: number;
    weeklyWorkoutTarget: number;
    dailyProteinTarget: number;
    startWeight: number;
    endWeight: number;
    dataSource: {
      protein: VerdictInputDataSource;
      training: VerdictInputDataSource;
      weight: VerdictInputDataSource;
    };
  };
  engineVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const dataSourceSchema = new Schema(
  {
    protein: { type: String, enum: ["logs", "checkin_fallback"], required: true },
    training: { type: String, enum: ["logs", "checkin_fallback"], required: true },
    weight: { type: String, enum: ["logs", "checkin_fallback"], required: true },
  },
  { _id: false },
);

const inputsUsedSchema = new Schema(
  {
    avgDailyProteinGrams: { type: Number, required: true, min: 0 },
    sessionsCompleted: { type: Number, required: true, min: 0 },
    weeklyWorkoutTarget: { type: Number, required: true, min: 1 },
    dailyProteinTarget: { type: Number, required: true, min: 1 },
    startWeight: { type: Number, required: true, min: 0 },
    endWeight: { type: Number, required: true, min: 0 },
    dataSource: { type: dataSourceSchema, required: true },
  },
  { _id: false },
);

const muscleRetentionSnapshotSchema = new Schema<MuscleRetentionSnapshotDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekOf: {
      type: Date,
      required: true,
      index: true,
    },
    proteinScore: { type: Number, required: true, min: 0, max: 100 },
    trainingScore: { type: Number, required: true, min: 0, max: 100 },
    paceScore: { type: Number, required: true, min: 0, max: 100 },
    muscleRetentionScore: { type: Number, required: true, min: 0, max: 100 },
    retentionLabel: {
      type: String,
      enum: ["keeping_muscle", "maintaining", "losing_some", "losing_muscle"],
      required: true,
      index: true,
    },
    weeklyWeightLossLb: { type: Number, required: true },
    cumulativeWeightLossLb: { type: Number, required: true },
    inputsUsed: { type: inputsUsedSchema, required: true },
    engineVersion: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

muscleRetentionSnapshotSchema.index({ userId: 1, weekOf: 1 }, { unique: true });

export const MuscleRetentionSnapshotModel = mongoose.model<MuscleRetentionSnapshotDocument>(
  "MuscleRetentionSnapshot",
  muscleRetentionSnapshotSchema,
);
