import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";
import type {
  EquipmentAccess,
  GoalPace,
  JourneyStage,
  LeanientFocusArea,
  Sex,
  TrainingStatus,
  WeightUnit,
} from "@leanient/shared";
import { NUTRITION_ENGINE_VERSION, SEX_VALUES } from "@leanient/shared";

export interface UserProfileDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  journeyStage: JourneyStage;
  goalWeight: number;
  goalWeightUnit: WeightUnit;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  goalPace: GoalPace;
  biggestFear: LeanientFocusArea;
  trainingStatus: TrainingStatus;
  equipmentAccess: EquipmentAccess;
  weeklyWorkoutTarget: number;
  sideEffectBaseline: string[];
  timezone: string;
  // Biological inputs for the Mifflin-St Jeor calorie model. Optional because
  // legacy profiles predate them; new profiles always set them at onboarding.
  sex?: Sex;
  ageYears?: number;
  heightInches?: number;
  nutritionEngineVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<UserProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    journeyStage: {
      type: String,
      enum: ["pre_start", "active_loss", "maintenance"],
      required: true,
    },
    goalWeight: {
      type: Number,
      required: true,
      min: 1,
    },
    goalWeightUnit: {
      type: String,
      enum: ["lb", "kg"],
      required: true,
    },
    dailyProteinTarget: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyCalorieTarget: {
      type: Number,
      required: true,
      min: 1,
    },
    goalPace: {
      type: String,
      enum: ["gentle", "steady", "aggressive"],
      required: true,
    },
    biggestFear: {
      type: String,
      enum: ["losing_muscle", "ozempic_face", "strength", "energy", "side_effects", "confidence"],
      required: true,
    },
    trainingStatus: {
      type: String,
      enum: ["not_training", "beginner", "consistent", "returning"],
      required: true,
    },
    equipmentAccess: {
      type: String,
      enum: ["none", "bodyweight_only", "dumbbells", "full_gym"],
      required: true,
      default: "bodyweight_only",
    },
    weeklyWorkoutTarget: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    sideEffectBaseline: {
      type: [String],
      default: [],
    },
    timezone: {
      type: String,
      default: "America/New_York",
      trim: true,
    },
    sex: {
      type: String,
      enum: SEX_VALUES,
      // Optional: legacy profiles predate this. Onboarding always sets it.
    },
    ageYears: {
      type: Number,
      min: 18,
      max: 100,
    },
    heightInches: {
      type: Number,
      min: 48,
      max: 96,
    },
    nutritionEngineVersion: {
      type: String,
      default: NUTRITION_ENGINE_VERSION,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const UserProfileModel = mongoose.model<UserProfileDocument>(
  "UserProfile",
  userProfileSchema,
);
