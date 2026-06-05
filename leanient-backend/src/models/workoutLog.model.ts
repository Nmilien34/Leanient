import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type { WeightUnit, WorkoutEffort } from "@leanient/shared";

export interface WorkoutLogSet {
  reps: number;
  weight: number | null;
  unit: WeightUnit | null;
}

export interface WorkoutLogExercise {
  name: string;
  sets: WorkoutLogSet[];
  muscleGroups: string[];
}

export interface WorkoutLogDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  workoutId?: Types.ObjectId;
  customWorkoutName?: string;
  exercises: WorkoutLogExercise[];
  durationMinutes: number;
  countsAsResistance: boolean;
  perceivedEffort?: WorkoutEffort;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workoutLogSetSchema = new Schema<WorkoutLogSet>(
  {
    reps: {
      type: Number,
      required: true,
      min: 1,
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    unit: {
      type: String,
      enum: ["lb", "kg", null],
      default: null,
    },
  },
  {
    _id: false,
  },
);

const workoutLogExerciseSchema = new Schema<WorkoutLogExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sets: {
      type: [workoutLogSetSchema],
      default: [],
    },
    muscleGroups: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const workoutLogSchema = new Schema<WorkoutLogDocument>(
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
    workoutId: {
      type: Schema.Types.ObjectId,
      ref: "Workout",
    },
    customWorkoutName: {
      type: String,
      trim: true,
    },
    exercises: {
      type: [workoutLogExerciseSchema],
      default: [],
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    countsAsResistance: {
      type: Boolean,
      required: true,
      default: false,
    },
    perceivedEffort: {
      type: String,
      enum: ["easy", "normal", "hard"],
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

workoutLogSchema.index({ userId: 1, recordedAt: -1 });
workoutLogSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const WorkoutLogModel = mongoose.model<WorkoutLogDocument>("WorkoutLog", workoutLogSchema);
