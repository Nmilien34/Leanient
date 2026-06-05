import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type {
  FocusCategory,
  TodaysFocusActionType,
  TodaysFocusInputsSnapshot,
} from "@leanient/shared";

export interface TodaysFocusCoachContent {
  headline: string;
  suggestion: string;
  actionType: TodaysFocusActionType;
  actionLabel: string | null;
  copyVersion: string;
}

export interface TodaysFocusDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  utcDate: Date;
  category: FocusCategory;
  selectionReason: string;
  coachContent: TodaysFocusCoachContent | null;
  inputsSnapshot: TodaysFocusInputsSnapshot;
  engineVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const coachContentSchema = new Schema<TodaysFocusCoachContent>(
  {
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    suggestion: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      enum: ["log_meal", "log_workout", "log_dose", "take_photo", "view_progress", "none"],
      required: true,
    },
    actionLabel: {
      type: String,
      trim: true,
      default: null,
    },
    copyVersion: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const inputsSnapshotSchema = new Schema<TodaysFocusInputsSnapshot>(
  {
    proteinLoggedToday: {
      type: Number,
      required: true,
      min: 0,
    },
    proteinTargetToday: {
      type: Number,
      required: true,
      min: 1,
    },
    sessionsThisWeek: {
      type: Number,
      required: true,
      min: 0,
    },
    weeklyTarget: {
      type: Number,
      required: true,
      min: 1,
    },
    shotDayLabel: {
      type: String,
      default: null,
    },
    energy: {
      type: String,
      enum: ["good", "mid", "low", null],
      default: null,
    },
    daysSinceLastActivity: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const todaysFocusSchema = new Schema<TodaysFocusDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    utcDate: {
      type: Date,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "onboarding_nudge",
        "shot_day_recovery",
        "training_gap",
        "protein_gap",
        "steady_state",
      ],
      required: true,
    },
    selectionReason: {
      type: String,
      required: true,
      trim: true,
    },
    coachContent: {
      type: coachContentSchema,
      default: null,
    },
    inputsSnapshot: {
      type: inputsSnapshotSchema,
      required: true,
    },
    engineVersion: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

todaysFocusSchema.index({ userId: 1, utcDate: 1 }, { unique: true });

export const TodaysFocusModel = mongoose.model<TodaysFocusDocument>(
  "TodaysFocus",
  todaysFocusSchema,
);
