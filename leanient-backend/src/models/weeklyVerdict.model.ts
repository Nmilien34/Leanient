import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type {
  UserContextSnapshot,
  VerdictInputDataSource,
  VerdictSource,
  VerdictStatus,
  WeightMeasurement,
} from "@leanient/shared";

export interface WeeklyVerdictInputsUsed extends UserContextSnapshot {
  weight?: WeightMeasurement;
  proteinGramsPerDay?: number;
  resistanceWorkoutsCompleted?: number;
  dataSource?: {
    protein: VerdictInputDataSource;
    training: VerdictInputDataSource;
  };
}

export interface WeeklyVerdictDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  weekOf: string;
  checkinId: Types.ObjectId | null;
  source: VerdictSource;
  engineVersion: string;
  copyVersion: string | null;
  explanation: string | null;
  status: VerdictStatus;
  score: number | null;
  estimatedLeanMassRisk: number | null;
  nextActionCode: string;
  headline: string;
  message: string;
  explanationFactors: string[];
  inputsUsed?: WeeklyVerdictInputsUsed;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyVerdictSchema = new Schema<WeeklyVerdictDocument>(
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
    checkinId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyCheckin",
      default: null,
    },
    source: {
      type: String,
      enum: ["checkin", "cron_backfill", "cron_no_data"],
      required: true,
    },
    engineVersion: {
      type: String,
      required: true,
    },
    copyVersion: {
      type: String,
      default: null,
    },
    explanation: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["on_track", "drifting", "losing_muscle", "no_data"],
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    estimatedLeanMassRisk: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    nextActionCode: {
      type: String,
      required: true,
    },
    headline: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    explanationFactors: {
      type: [String],
      default: [],
    },
    inputsUsed: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

weeklyVerdictSchema.index({ userId: 1, weekOf: 1 }, { unique: true });

export const WeeklyVerdictModel = mongoose.model<WeeklyVerdictDocument>(
  "WeeklyVerdict",
  weeklyVerdictSchema,
);
